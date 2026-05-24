/**
 * Auth helpers (Phase 10).
 * JWT + bcrypt. Guest mode generates a signed token with no DB record.
 */

import { createHmac, randomBytes } from 'crypto';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cabo-dev-secret-change-in-prod';
const TOKEN_TTL = 7 * 24 * 3600; // 7 days in seconds

// ── Minimal JWT (no external lib) ────────────────────────────────────────────

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload) {
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const sig     = b64url(createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

export function verify(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = b64url(createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest());
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Guest tokens ──────────────────────────────────────────────────────────────

export function guestToken(displayName) {
  const id = 'g_' + randomBytes(8).toString('hex');
  return {
    token: sign({ sub: id, name: displayName, guest: true, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }),
    userId: id,
    name: displayName,
  };
}

// ── Registered users ─────────────────────────────────────────────────────────

export async function register(username, password) {
  const { createHash } = await import('crypto');
  let bcrypt;
  try {
    bcrypt = (await import('bcrypt')).default;
  } catch {
    // bcrypt unavailable — use SHA-256 as weak fallback (dev only)
    bcrypt = { hash: async (p) => createHash('sha256').update(p).digest('hex'), compare: async (p, h) => createHash('sha256').update(p).digest('hex') === h };
    console.warn('[auth] bcrypt unavailable, using SHA-256 fallback (dev only!)');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const res = await query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
    [username, passwordHash],
  );
  if (!res) throw new Error('Database unavailable');
  const user = res.rows[0];
  return {
    token: sign({ sub: user.id, name: user.username, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }),
    userId: user.id,
    name: user.username,
  };
}

export async function login(username, password) {
  let bcrypt;
  try { bcrypt = (await import('bcrypt')).default; }
  catch { const { createHash } = await import('crypto'); bcrypt = { compare: async (p, h) => createHash('sha256').update(p).digest('hex') === h }; }

  const res = await query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
  if (!res || !res.rows.length) return null;
  const user = res.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return {
    token: sign({ sub: user.id, name: user.username, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }),
    userId: user.id,
    name: user.username,
  };
}

// Express middleware
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verify(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = payload;
  next();
}

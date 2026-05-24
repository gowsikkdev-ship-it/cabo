/**
 * PostgreSQL client (Phase 10 — match history / leaderboard).
 * Provides a thin pool wrapper. If DATABASE_URL is absent the server still
 * runs — match persistence is simply skipped.
 */

let pool = null;

export async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[db] DATABASE_URL not set — match persistence disabled');
    return;
  }
  try {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: url, max: 10 });
    await pool.query('SELECT 1');
    console.log('[db] PostgreSQL connected');
  } catch (err) {
    console.warn('[db] PostgreSQL connection failed, skipping persistence:', err.message);
    pool = null;
  }
}

export async function query(sql, params) {
  if (!pool) return null;
  return pool.query(sql, params);
}

export function isConnected() { return pool !== null; }

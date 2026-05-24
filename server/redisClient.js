/**
 * Redis client (Phase 8 — reconnection/persistence).
 * Uses ioredis when REDIS_URL is set; falls back to an in-process Map so the
 * server works without Redis during local development.
 */

let redis = null;
let usingFallback = false;

async function connect() {
  const url = process.env.REDIS_URL;
  if (!url) {
    usingFallback = true;
    console.warn('[redis] REDIS_URL not set — using in-process fallback (no persistence)');
    return;
  }

  try {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    await redis.connect();
    console.log('[redis] connected:', url);
  } catch (err) {
    usingFallback = true;
    console.warn('[redis] connection failed, using in-process fallback:', err.message);
    redis = null;
  }
}

// In-process fallback store (survives restarts only within the same process)
const fallback = new Map();

async function get(key) {
  if (usingFallback) return fallback.get(key) ?? null;
  return redis.get(key);
}

async function set(key, value, ttlSeconds) {
  if (usingFallback) {
    fallback.set(key, value);
    if (ttlSeconds) {
      setTimeout(() => fallback.delete(key), ttlSeconds * 1000);
    }
    return;
  }
  if (ttlSeconds) {
    await redis.set(key, value, 'EX', ttlSeconds);
  } else {
    await redis.set(key, value);
  }
}

async function del(key) {
  if (usingFallback) { fallback.delete(key); return; }
  return redis.del(key);
}

async function getJSON(key) {
  const raw = await get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function setJSON(key, value, ttlSeconds) {
  await set(key, JSON.stringify(value), ttlSeconds);
}

export default { connect, get, set, del, getJSON, setJSON };

/**
 * Per-socket sliding-window rate limiter (Phase 9 — anti-cheat).
 * Default: 15 events per second. Exceeding triggers a kick.
 */

const WINDOW_MS  = 1000;
const MAX_EVENTS = 15;

// socketId → timestamps[]
const windows = new Map();

export function track(socketId) {
  const now = Date.now();
  let ts = windows.get(socketId);
  if (!ts) { ts = []; windows.set(socketId, ts); }

  // Drop timestamps outside the window
  while (ts.length && ts[0] <= now - WINDOW_MS) ts.shift();

  ts.push(now);
  return ts.length <= MAX_EVENTS; // false = rate limit exceeded
}

export function remove(socketId) {
  windows.delete(socketId);
}

/**
 * Per-socket RTT tracking for latency-compensated Mine reactions (Phase 7).
 *
 * Server sends SERVER_PING with a nonce every ~5 s.
 * Client echoes CLIENT_PONG with the same nonce immediately.
 * We keep a rolling 5-sample average per socket.
 *
 * Usage:
 *   latency.start(io, socket)  — call on connection, starts probe loop
 *   latency.stop(socketId)     — call on disconnect
 *   latency.adjusted(socketId, serverReceivedAt) — timestamp adjusted for RTT
 */

const PROBE_INTERVAL_MS = 5000;
const SAMPLE_SIZE = 5;

// socketId → { samples: number[], pending: Map<nonce, sentAt>, intervalId }
const state = new Map();

let _io = null;

export function init(io) { _io = io; }

export function start(socket) {
  const entry = { samples: [], pending: new Map(), intervalId: null };
  state.set(socket.id, entry);

  socket.on('client_pong', ({ nonce }) => {
    const s = state.get(socket.id);
    if (!s) return;
    const sentAt = s.pending.get(nonce);
    if (sentAt === undefined) return;
    s.pending.delete(nonce);
    const rtt = Date.now() - sentAt;
    s.samples.push(rtt);
    if (s.samples.length > SAMPLE_SIZE) s.samples.shift();
  });

  entry.intervalId = setInterval(() => {
    const s = state.get(socket.id);
    if (!s) return;
    const nonce = Math.random().toString(36).slice(2);
    s.pending.set(nonce, Date.now());
    socket.emit('server_ping', { nonce });
  }, PROBE_INTERVAL_MS);
}

export function stop(socketId) {
  const s = state.get(socketId);
  if (!s) return;
  clearInterval(s.intervalId);
  state.delete(socketId);
}

export function avgRtt(socketId) {
  const s = state.get(socketId);
  if (!s || s.samples.length === 0) return 0;
  return s.samples.reduce((a, b) => a + b, 0) / s.samples.length;
}

/** Returns the timestamp adjusted backward by half the socket's average RTT. */
export function adjusted(socketId, serverReceivedAt) {
  return serverReceivedAt - Math.round(avgRtt(socketId) / 2);
}

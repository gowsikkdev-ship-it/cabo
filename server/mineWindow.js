/**
 * Realtime Mine reaction window (Phase 6).
 *
 * When a card is discarded, the server opens a 2-second window in which
 * non-active players may call "Mine!". The first adjusted timestamp wins.
 *
 * Only one window may be open per room at a time.
 */

import { MINE_WINDOW_MS } from '../shared/constants.js';
import { adjusted } from './latency.js';

// roomCode → { reactions: [{playerId, adjustedAt}], timer, resolve }
const windows = new Map();

/**
 * Open a Mine window for a room.
 * @param {string} code  — room code
 * @param {number} openedAt  — server timestamp (Date.now())
 * @param {function} onClose — callback(reactions) when window expires
 * @returns expiresAt timestamp
 */
export function open(code, openedAt, onClose) {
  if (windows.has(code)) close(code);

  const expiresAt = openedAt + MINE_WINDOW_MS;

  const timer = setTimeout(() => {
    const w = windows.get(code);
    if (!w) return;
    windows.delete(code);
    const sorted = [...w.reactions].sort((a, b) => a.adjustedAt - b.adjustedAt);
    onClose(sorted);
  }, MINE_WINDOW_MS);

  windows.set(code, { reactions: [], timer, expiresAt });
  return expiresAt;
}

/**
 * Record a Mine reaction from a player.
 * Returns false if the window is closed or the player already reacted.
 */
export function react(code, socketId, playerId) {
  const w = windows.get(code);
  if (!w) return false;
  if (w.reactions.some(r => r.playerId === playerId)) return false;

  const serverReceivedAt = Date.now();
  const adjustedAt = adjusted(socketId, serverReceivedAt);
  w.reactions.push({ playerId, adjustedAt, serverReceivedAt });
  return true;
}

/** Immediately close the window without waiting for the timeout. */
export function close(code) {
  const w = windows.get(code);
  if (!w) return;
  clearTimeout(w.timer);
  windows.delete(code);
}

export function isOpen(code) { return windows.has(code); }
export function expiresAt(code) { return windows.get(code)?.expiresAt ?? null; }

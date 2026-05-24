/**
 * Realtime Mine reaction window (Phase 6).
 *
 * Opens a timer window when a card is discarded. Non-active players may call
 * "Mine!". The first reaction triggers a short 400ms simultaneous-press window,
 * then the earliest adjusted timestamp wins. If no one reacts, the full
 * MINE_WINDOW_MS elapses and the turn ends.
 */

import { MINE_WINDOW_MS } from '../shared/constants.js';
import { adjusted } from './latency.js';

// roomCode → { reactions, timer, expiresAt, onClose }
const windows = new Map();

const CATCH_MS = 400; // extra window after first reaction to catch simultaneous presses

/**
 * Open a Mine window for a room.
 * @param {string}   code     — room code
 * @param {number}   openedAt — server timestamp (Date.now())
 * @param {function} onClose  — callback(reactions) when window resolves
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
    w.onClose(sorted);
  }, MINE_WINDOW_MS);

  windows.set(code, { reactions: [], timer, expiresAt, onClose });
  return expiresAt;
}

/**
 * Record a Mine reaction from a player.
 * First reaction cancels the full timer and starts a short 400ms catch window.
 * Returns false if the window is already closed or player already reacted.
 */
export function react(code, socketId, playerId) {
  const w = windows.get(code);
  if (!w) return false;
  if (w.reactions.some(r => r.playerId === playerId)) return false;

  const serverReceivedAt = Date.now();
  const adjustedAt = adjusted(socketId, serverReceivedAt);
  w.reactions.push({ playerId, adjustedAt, serverReceivedAt });

  // First reaction: replace the full timer with a short catch-up window
  if (w.reactions.length === 1) {
    clearTimeout(w.timer);
    w.timer = setTimeout(() => {
      const win = windows.get(code);
      if (!win) return;
      windows.delete(code);
      const sorted = [...win.reactions].sort((a, b) => a.adjustedAt - b.adjustedAt);
      win.onClose(sorted);
    }, CATCH_MS);
  }

  return true;
}

/** Immediately close the window without firing onClose. */
export function close(code) {
  const w = windows.get(code);
  if (!w) return;
  clearTimeout(w.timer);
  windows.delete(code);
}

export function isOpen(code)    { return windows.has(code); }
export function expiresAt(code) { return windows.get(code)?.expiresAt ?? null; }

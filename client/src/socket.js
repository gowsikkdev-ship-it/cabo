/**
 * Socket.IO singleton (Phase 5).
 * Import `socket` anywhere to send/listen. Connection is initiated lazily
 * when `connect()` is called with a JWT token.
 */

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let socket = null;

export function connect(token) {
  if (socket) return socket;
  socket = io(SERVER_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionAttempts: 10,
  });
  return socket;
}

export function getSocket() { return socket; }

export function disconnect() {
  socket?.disconnect();
  socket = null;
}

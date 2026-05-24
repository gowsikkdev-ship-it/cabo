/**
 * Room management (Phase 5 / 8).
 *
 * A Room holds:
 *   code        — 6-char join code (uppercase)
 *   hostId      — socket.id of the creator
 *   players     — Map<playerId, { socketId, name, ready }>
 *   gameState   — null until game starts; full engine state
 *   started     — boolean
 *   socketToPlayer — Map<socketId, playerId>
 *
 * Rooms survive disconnects for RECONNECT_TTL_MS; the socket mapping updates
 * on reconnect. State is also persisted to Redis (if available) so a server
 * restart can restore it.
 */

import { randomBytes } from 'crypto';
import redis from './redisClient.js';

const RECONNECT_TTL_MS  = 30_000; // 30 s to reconnect before kicked
const REDIS_TTL_SECONDS = 3600;   // 1 h — room expires in Redis after this

// In-process store
const rooms = new Map();           // code → room
const socketToRoom = new Map();    // socketId → code
const disconnectTimers = new Map(); // playerId → setTimeout handle

// ── Helpers ──────────────────────────────────────────────────────────────────

function genCode() {
  let code;
  do { code = randomBytes(3).toString('hex').toUpperCase(); }
  while (rooms.has(code));
  return code;
}

async function persist(code) {
  const room = rooms.get(code);
  if (!room) return;
  // Convert Maps to plain objects for JSON serialisation
  const serialisable = {
    ...room,
    players: Object.fromEntries(room.players),
    socketToPlayer: Object.fromEntries(room.socketToPlayer),
  };
  await redis.setJSON(`room:${code}`, serialisable, REDIS_TTL_SECONDS);
}

async function restore(code) {
  const data = await redis.getJSON(`room:${code}`);
  if (!data) return null;
  const room = {
    ...data,
    players: new Map(Object.entries(data.players)),
    socketToPlayer: new Map(Object.entries(data.socketToPlayer)),
  };
  rooms.set(code, room);
  return room;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function createRoom(socketId, playerName, playerId) {
  const code = genCode();
  const room = {
    code,
    hostId: playerId,
    players: new Map([[playerId, { socketId, name: playerName, ready: false }]]),
    socketToPlayer: new Map([[socketId, playerId]]),
    gameState: null,
    started: false,
  };
  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  persist(code);
  return room;
}

export async function joinRoom(code, socketId, playerName, playerId) {
  let room = rooms.get(code);
  if (!room) room = await restore(code);
  if (!room) return { error: 'Room not found' };
  if (room.started) return { error: 'Game already started' };
  if (room.players.size >= 6) return { error: 'Room is full' };
  if (room.players.has(playerId)) return { error: 'Already in room' };

  room.players.set(playerId, { socketId, name: playerName, ready: false });
  room.socketToPlayer.set(socketId, playerId);
  socketToRoom.set(socketId, code);
  persist(code);
  return { room };
}

export async function reconnect(code, socketId, playerId) {
  let room = rooms.get(code);
  if (!room) room = await restore(code);
  if (!room) return { error: 'Room not found' };

  const player = room.players.get(playerId);
  if (!player) return { error: 'Player not in room' };

  // Cancel any pending kick timer
  const timer = disconnectTimers.get(playerId);
  if (timer) { clearTimeout(timer); disconnectTimers.delete(playerId); }

  // Remove old socket mapping
  room.socketToPlayer.delete(player.socketId);

  // Update to new socket
  player.socketId = socketId;
  room.socketToPlayer.set(socketId, playerId);
  socketToRoom.set(socketId, code);
  persist(code);
  return { room, player };
}

export function setReady(socketId, ready) {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;
  const playerId = room.socketToPlayer.get(socketId);
  const player = room.players.get(playerId);
  if (!player) return null;
  player.ready = ready;
  persist(code);
  return room;
}

export function allReady(code) {
  const room = rooms.get(code);
  if (!room || room.players.size < 2) return false;
  for (const p of room.players.values()) { if (!p.ready) return false; }
  return true;
}

export function startGame(code, gameState) {
  const room = rooms.get(code);
  if (!room) return;
  room.started = true;
  room.gameState = gameState;
  persist(code);
}

export function updateGameState(code, gameState) {
  const room = rooms.get(code);
  if (!room) return;
  room.gameState = gameState;
  persist(code);
}

export function getRoom(code) { return rooms.get(code) ?? null; }

export function getRoomBySocket(socketId) {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : null;
}

export function getPlayerId(socketId) {
  const room = getRoomBySocket(socketId);
  if (!room) return null;
  return room.socketToPlayer.get(socketId) ?? null;
}

/**
 * Handle disconnect. Starts a reconnect timer; if the player doesn't rejoin
 * within RECONNECT_TTL_MS they are removed from the room. Returns the room.
 */
export function handleDisconnect(socketId, onExpired) {
  const room = getRoomBySocket(socketId);
  if (!room) return null;

  const playerId = room.socketToPlayer.get(socketId);
  if (!playerId) return null;

  const timer = setTimeout(() => {
    disconnectTimers.delete(playerId);
    const r = rooms.get(room.code);
    if (!r) return;
    r.players.delete(playerId);
    r.socketToPlayer.delete(socketId);
    socketToRoom.delete(socketId);
    if (r.players.size === 0) rooms.delete(room.code);
    persist(room.code);
    onExpired?.(playerId, r);
  }, RECONNECT_TTL_MS);

  disconnectTimers.set(playerId, timer);
  socketToRoom.delete(socketId);
  persist(room.code);
  return room;
}

export function playerList(code) {
  const room = rooms.get(code);
  if (!room) return [];
  return Array.from(room.players.entries()).map(([id, p]) => ({
    id, name: p.name, ready: p.ready,
    connected: !disconnectTimers.has(id),
  }));
}

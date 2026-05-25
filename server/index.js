/**
 * Cabo Game Server — Phases 5-9
 *
 * Authoritative game logic runs here. Clients send action names only; server
 * validates, advances state, sanitizes, and broadcasts.
 *
 * Phase 5  — WebSocket rooms, action routing, state broadcast
 * Phase 6  — Realtime Mine window with server-side timer
 * Phase 7  — Latency compensation (RTT probing)
 * Phase 8  — Reconnection via Redis-persisted rooms
 * Phase 9  — State sanitization + per-socket rate limiting
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import redis from './redisClient.js';
import * as db from './db.js';
import { verify as verifyToken, guestToken, register, login, requireAuth } from './auth.js';
import * as latency from './latency.js';
import * as rate from './rateLimiter.js';
import { sanitizeForPlayer, reveal, clearReveal } from './sanitize.js';
import * as rooms from './rooms.js';
import * as mineWindow from './mineWindow.js';
import { EVENTS } from '../shared/events.js';
import { PHASES } from '../shared/constants.js';
import {
  createInitialState,
  playerReady,
  callCabo,
  drawCard,
  actionSwap,
  actionUsePower,
  actionDiscard,
  actionEliminate,
  powerSelect,
  powerConfirmReveal,
  powerSwapSecond,
  callMine,
  mineNoCall,
  mineExchange,
  mineSelfElim,
  mineOppElim,
  resolveCabo,
  startNewRound,
  forceEndGame,
} from '../shared/gameEngine.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const PORT       = process.env.PORT       || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

latency.init(io);

await redis.connect();
await db.connect();

// ── REST endpoints ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok', phase: 9 }));

app.post('/auth/guest', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 1)
    return res.status(400).json({ error: 'Name required' });
  res.json(guestToken(name.trim().slice(0, 24)));
});

app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    res.json(await register(username, password));
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const result = await login(username, password);
  if (!result) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(result);
});

// ── Socket middleware ─────────────────────────────────────────────────────────

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No auth token'));
  const payload = verifyToken(token);
  if (!payload) return next(new Error('Invalid token'));
  socket.playerId   = payload.sub;
  socket.playerName = payload.name;
  next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function emitError(socket, message) {
  socket.emit(EVENTS.ERROR, { message });
}

/**
 * Broadcast sanitized game state to every player in a room.
 * Each player's view is individually filtered.
 */
function broadcastState(code) {
  const room = rooms.getRoom(code);
  if (!room?.gameState) return;
  for (const [playerId, player] of room.players.entries()) {
    const sanitized = sanitizeForPlayer(room.gameState, playerId);
    io.to(player.socketId).emit(EVENTS.GAME_STATE_UPDATE, sanitized);
  }
}

function getState(code) {
  return rooms.getRoom(code)?.gameState ?? null;
}

function setState(code, newState) {
  rooms.updateGameState(code, newState);
}

/** Apply an engine function, persist state, broadcast. */
function applyAndBroadcast(code, fn) {
  const state = getState(code);
  if (!state) return;
  const next = fn(state);
  setState(code, next);
  broadcastState(code);
  return next;
}

/** Ratecheck — disconnect socket if limit exceeded. */
function rateLimited(socket) {
  if (!rate.track(socket.id)) {
    socket.emit(EVENTS.KICKED, { reason: 'Rate limit exceeded' });
    socket.disconnect(true);
    return true;
  }
  return false;
}

/** Assert it is this player's turn and the game is in the expected phase(s). */
function assertTurn(socket, state, ...phases) {
  const playerId = socket.playerId;
  const activePlayer = state.players[state.currentTurnIndex];
  if (activePlayer.id !== playerId) { emitError(socket, 'Not your turn'); return false; }
  if (phases.length && !phases.includes(state.phase)) { emitError(socket, 'Wrong phase'); return false; }
  return true;
}

/** For Mine actions — assert it is NOT this player's turn. */
function assertNotTurn(socket, state) {
  const activePlayer = state.players[state.currentTurnIndex];
  if (activePlayer.id === socket.playerId) { emitError(socket, 'Active player cannot call Mine'); return false; }
  return true;
}

// ── Mine window resolution ────────────────────────────────────────────────────

function openMineWindow(code) {
  const now = Date.now();
  const expiresAt = mineWindow.open(code, now, (reactions) => {
    resolveMineWindow(code, reactions);
  });

  const room = rooms.getRoom(code);
  if (!room) return;

  io.to(code).emit(EVENTS.MINE_WINDOW_OPEN, { expiresAt });
}

function resolveMineWindow(code, reactions) {
  const room = rooms.getRoom(code);
  if (!room) return;

  io.to(code).emit(EVENTS.MINE_WINDOW_CLOSE, {});

  const advanceTurn = () => {
    const next = applyAndBroadcast(code, (s) => mineNoCall(s));
    if (next?.phase === PHASES.CABO_RESOLUTION) {
      setTimeout(() => applyAndBroadcast(code, (s) => resolveCabo(s)), 100);
    }
  };

  if (reactions.length === 0) {
    advanceTurn();
    return;
  }

  // Try reactions in sorted order; skip any the engine blocks (mineLastActedBy check)
  let baseState = getState(code);
  if (!baseState) return;

  let acceptedWinnerId = null;
  let finalState = baseState;
  for (const reaction of reactions) {
    const attempted = callMine(baseState, reaction.playerId);
    if (attempted !== baseState) {
      finalState = attempted;
      acceptedWinnerId = reaction.playerId;
      break;
    }
  }

  if (!acceptedWinnerId) {
    // All reactions were blocked (e.g. only the cooldown player reacted) — treat as no-call
    advanceTurn();
    return;
  }

  setState(code, finalState);
  broadcastState(code);

  io.to(code).emit(EVENTS.MINE_RESULT, {
    winnerId: acceptedWinnerId,
    reactions: reactions.map(r => ({ playerId: r.playerId, adjustedAt: r.adjustedAt })),
  });
}

// ── Socket events ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[socket] +${socket.id} (${socket.playerName})`);
  latency.start(socket);

  // ── Room management ──────────────────────────────────────────────────────────

  socket.on(EVENTS.CREATE_ROOM, () => {
    if (rateLimited(socket)) return;
    const room = rooms.createRoom(socket.id, socket.playerName, socket.playerId);
    socket.join(room.code);
    socket.emit(EVENTS.ROOM_CREATED, { code: room.code });
    socket.emit(EVENTS.PLAYER_LIST, rooms.playerList(room.code));
  });

  socket.on(EVENTS.JOIN_ROOM, async ({ code }) => {
    if (rateLimited(socket)) return;
    if (typeof code !== 'string') return emitError(socket, 'Invalid room code');
    const result = await rooms.joinRoom(code.toUpperCase(), socket.id, socket.playerName, socket.playerId);
    if (result.error) return emitError(socket, result.error);
    socket.join(code.toUpperCase());
    socket.emit(EVENTS.ROOM_JOINED, { code: code.toUpperCase() });
    io.to(code.toUpperCase()).emit(EVENTS.PLAYER_LIST, rooms.playerList(code.toUpperCase()));
  });

  socket.on(EVENTS.RECONNECT, async ({ code, token }) => {
    if (!code || !token) return emitError(socket, 'code and token required');
    const payload = verifyToken(token);
    if (!payload) return emitError(socket, 'Invalid token');
    const playerId = payload.sub;
    const result = await rooms.reconnect(code.toUpperCase(), socket.id, playerId);
    if (result.error) return emitError(socket, result.error);
    socket.join(code.toUpperCase());
    // Re-send full private state
    const sanitized = sanitizeForPlayer(result.room.gameState, playerId);
    socket.emit(EVENTS.GAME_STATE_UPDATE, sanitized);
    io.to(code.toUpperCase()).emit(EVENTS.PLAYER_LIST, rooms.playerList(code.toUpperCase()));
  });

  socket.on(EVENTS.PLAYER_READY, ({ ready }) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;

    // During INITIAL_REVEAL the engine tracks readiness, not the lobby
    const state = getState(room.code);
    if (state?.phase === PHASES.INITIAL_REVEAL) {
      applyAndBroadcast(room.code, (s) => playerReady(s, socket.playerId));
      return;
    }

    // Lobby ready toggle
    rooms.setReady(socket.id, ready !== false);
    io.to(room.code).emit(EVENTS.PLAYER_LIST, rooms.playerList(room.code));
  });

  socket.on(EVENTS.START_GAME, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return emitError(socket, 'Not in a room');
    if (room.hostId !== socket.playerId) return emitError(socket, 'Only host can start');
    if (room.players.size < 2) return emitError(socket, 'Need at least 2 players');
    if (room.started) return emitError(socket, 'Already started');

    const playerNames = Array.from(room.players.values()).map(p => p.name);
    const playerIds   = Array.from(room.players.keys());

    // Build initial state using real player IDs (not p0/p1/...)
    let state = createInitialState(playerNames);
    // Replace generated IDs with real player IDs
    state = {
      ...state,
      players: state.players.map((p, i) => ({ ...p, id: playerIds[i] })),
      cumulativeScores: Object.fromEntries(playerIds.map(id => [id, 0])),
    };

    rooms.startGame(room.code, state);
    io.to(room.code).emit(EVENTS.GAME_STARTED, {});
    broadcastState(room.code);
  });

  // ── Turn actions ─────────────────────────────────────────────────────────────

  socket.on(EVENTS.CALL_CABO, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.DRAW)) return;
    applyAndBroadcast(room.code, (s) => callCabo(s));
    // After calling Cabo, still need to draw and discard before round ends
  });

  socket.on(EVENTS.DRAW_CARD, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.DRAW)) return;
    applyAndBroadcast(room.code, (s) => drawCard(s));
  });

  socket.on(EVENTS.ACTION_SWAP, ({ position }) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.ACTION)) return;
    if (typeof position !== 'string') return emitError(socket, 'position required');
    const next = applyAndBroadcast(room.code, (s) => actionSwap(s, position));
    if (next?.phase === PHASES.MINE) openMineWindow(room.code);
  });

  socket.on(EVENTS.ACTION_USE_POWER, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.ACTION)) return;
    applyAndBroadcast(room.code, (s) => actionUsePower(s));
  });

  socket.on(EVENTS.ACTION_DISCARD, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.ACTION)) return;

    const next = applyAndBroadcast(room.code, (s) => actionDiscard(s));

    if (next?.phase === PHASES.MINE) openMineWindow(room.code);
  });

  socket.on(EVENTS.ACTION_ELIMINATE, ({ targetPlayerId, position } = {}) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.ACTION)) return;
    if (typeof targetPlayerId !== 'string' || typeof position !== 'string')
      return emitError(socket, 'targetPlayerId and position required');

    const next = applyAndBroadcast(room.code, (s) => actionEliminate(s, targetPlayerId, position));

    if (next?.phase === PHASES.MINE) openMineWindow(room.code);
  });

  socket.on(EVENTS.POWER_SELECT, ({ targetPlayerId, position }) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.POWER_SELECT)) return;
    if (typeof position !== 'string') return emitError(socket, 'position required');

    const next = applyAndBroadcast(room.code, (s) => powerSelect(s, targetPlayerId, position));

    // If it was a view power, send private reveal to the viewing player
    if (next?.powerReveal) {
      const { viewerId } = next.powerReveal;
      const viewerPlayer = rooms.getRoom(room.code)?.players.get(viewerId);
      if (viewerPlayer) {
        io.to(viewerPlayer.socketId).emit(EVENTS.PRIVATE_REVEAL, next.powerReveal);
      }
    }
  });

  socket.on(EVENTS.POWER_CONFIRM_REVEAL, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.POWER_REVEAL)) return;
    const next = applyAndBroadcast(room.code, (s) => powerConfirmReveal(s));
    if (next?.phase === PHASES.MINE) openMineWindow(room.code);
  });

  socket.on(EVENTS.POWER_SWAP_SECOND, ({ targetPlayerId, position }) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (!assertTurn(socket, state, PHASES.POWER_SWAP_SECOND)) return;
    if (typeof position !== 'string') return emitError(socket, 'position required');

    const next = applyAndBroadcast(room.code, (s) => powerSwapSecond(s, targetPlayerId, position));

    if (next?.phase === PHASES.MINE) openMineWindow(room.code);
  });

  // ── Mine reactions (during realtime window) ──────────────────────────────────

  socket.on(EVENTS.CALL_MINE, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    const activePlayer = state.players[state.currentTurnIndex];
    if (activePlayer.id === socket.playerId && !state.mineChainMode)
      return emitError(socket, 'Active player cannot call Mine on their own discard');
    if (state.mineLastActedBy === socket.playerId)
      return emitError(socket, 'Cannot Mine immediately after your own exchange/elimination');
    if (!mineWindow.isOpen(room.code)) return emitError(socket, 'Mine window is closed');

    mineWindow.react(room.code, socket.id, socket.playerId);
  });

  // ── Mine action phase (after winner is determined) ───────────────────────────

  socket.on(EVENTS.MINE_EXCHANGE, ({ position } = {}) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (state.phase !== PHASES.MINE_ACTION) return emitError(socket, 'Wrong phase');
    if (state.mineWinner !== socket.playerId) return emitError(socket, 'Not the Mine winner');
    if (typeof position !== 'string') return emitError(socket, 'position required');

    const next = applyAndBroadcast(room.code, (s) => mineExchange(s, position));

    // After exchange, open another Mine window on the new discard
    if (next?.phase === PHASES.MINE) {
      openMineWindow(room.code);
    }
  });

  socket.on(EVENTS.MINE_SELF_ELIM, ({ position }) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (state.phase !== PHASES.MINE_ACTION) return emitError(socket, 'Wrong phase');
    if (state.mineWinner !== socket.playerId) return emitError(socket, 'Not the Mine winner');
    if (typeof position !== 'string') return emitError(socket, 'position required');

    const next = applyAndBroadcast(room.code, (s) => mineSelfElim(s, position));

    io.to(room.code).emit(EVENTS.ELIM_RESULT, {
      winnerId: socket.playerId,
      type: 'self',
      position,
      success: next?.log?.at(-1)?.includes('Success') ?? null,
    });

    if (next?.phase === PHASES.MINE) {
      openMineWindow(room.code);
    }
  });

  socket.on(EVENTS.MINE_OPP_ELIM, ({ targetPlayerId, position }) => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (state.phase !== PHASES.MINE_ACTION) return emitError(socket, 'Wrong phase');
    if (state.mineWinner !== socket.playerId) return emitError(socket, 'Not the Mine winner');
    if (typeof targetPlayerId !== 'string' || typeof position !== 'string')
      return emitError(socket, 'targetPlayerId and position required');

    const next = applyAndBroadcast(room.code, (s) => mineOppElim(s, targetPlayerId, position));

    io.to(room.code).emit(EVENTS.ELIM_RESULT, {
      winnerId: socket.playerId,
      type: 'opponent',
      targetPlayerId,
      position,
      success: next?.log?.at(-1)?.includes('Success') ?? null,
    });

    if (next?.phase === PHASES.MINE) {
      openMineWindow(room.code);
    }
  });

  socket.on(EVENTS.MINE_NO_CALL, () => {
    // Explicit "end turn" from host UI (offline fallback / fallback button)
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (state.phase !== PHASES.MINE) return;
    mineWindow.close(room.code);
    applyAndBroadcast(room.code, (s) => mineNoCall(s));
  });

  // ── Cabo resolution ──────────────────────────────────────────────────────────

  socket.on(EVENTS.RESOLVE_CABO, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (state.phase !== PHASES.CABO_RESOLUTION) return;

    const next = applyAndBroadcast(room.code, (s) => resolveCabo(s));

    if (next?.phase === PHASES.GAME_OVER) {
      io.to(room.code).emit(EVENTS.GAME_END, {
        scores: next.cumulativeScores,
        players: next.players.map(p => ({ id: p.id, name: p.name })),
      });
    } else if (next?.phase === PHASES.ROUND_OVER) {
      io.to(room.code).emit(EVENTS.ROUND_END, {
        roundScores: next.roundScores,
        cumulativeScores: next.cumulativeScores,
        caboSuccess: next.caboSuccess,
        caboCaller: next.caboCaller,
      });
    }
  });

  socket.on(EVENTS.START_NEW_ROUND, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const state = getState(room.code);
    if (!state) return;
    if (state.phase !== PHASES.ROUND_OVER) return;
    applyAndBroadcast(room.code, (s) => startNewRound(s));
  });

  socket.on(EVENTS.CHAT_SEND, ({ message }) => {
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    const text = String(message ?? '').trim().slice(0, 200);
    if (!text) return;
    io.to(room.code).emit(EVENTS.CHAT_MSG, {
      playerId: socket.playerId,
      name: socket.playerName,
      text,
      at: Date.now(),
    });
  });

  socket.on(EVENTS.FORCE_END_GAME, () => {
    if (rateLimited(socket)) return;
    const room = rooms.getRoomBySocket(socket.id);
    if (!room) return;
    // Only the host (first player) may force-end
    if (room.hostId && room.hostId !== socket.playerId) {
      return emitError(socket, 'Only the host can end the game early');
    }
    const state = getState(room.code);
    if (!state) return;
    if (state.phase === PHASES.GAME_OVER) return;
    const next = applyAndBroadcast(room.code, (s) => forceEndGame(s));
    if (next?.phase === PHASES.GAME_OVER) {
      io.to(room.code).emit(EVENTS.GAME_END, {
        scores: next.cumulativeScores,
        players: next.players.map(p => ({ id: p.id, name: p.name })),
      });
    }
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[socket] -${socket.id} (${socket.playerName})`);
    latency.stop(socket.id);
    rate.remove(socket.id);

    const room = rooms.handleDisconnect(socket.id, (expiredPlayerId, r) => {
      io.to(r.code).emit(EVENTS.PLAYER_LIST, rooms.playerList(r.code));
      io.to(r.code).emit(EVENTS.ERROR, { message: `${expiredPlayerId} was removed after reconnect timeout` });
    });

    if (room) {
      io.to(room.code).emit(EVENTS.PLAYER_LIST, rooms.playerList(room.code));
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Cabo server listening on :${PORT} (phases 5-9)`);
});

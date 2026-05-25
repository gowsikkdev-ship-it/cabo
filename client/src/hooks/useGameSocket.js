/**
 * useGameSocket — connects to the server, manages live game state (Phase 5-9).
 *
 * Returns:
 *   connected       boolean
 *   myPlayerId      string | null
 *   roomCode        string | null
 *   players         array — lobby player list
 *   gameState       sanitized GameState | null
 *   mineWindow      { expiresAt: number } | null
 *   lastElimResult  { winnerId, type, targetPlayerId?, position, success } | null
 *   error           string | null
 *
 *   createRoom()
 *   joinRoom(code)
 *   sendReady(ready)
 *   startGame()
 *   send(eventName, payload?)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { connect as connectSocket, disconnect as disconnectSocket } from '../socket.js';
import { EVENTS } from '@shared/events.js';
import { sounds } from '../sounds.js';

export default function useGameSocket(token, myPlayerId) {
  const [connected, setConnected]         = useState(false);
  const [roomCode, setRoomCode]           = useState(null);
  const [players, setPlayers]             = useState([]);
  const [gameState, setGameState]         = useState(null);
  const [mineWindow, setMineWindow]       = useState(null);
  const [lastElimResult, setLastElimResult] = useState(null);
  const [error, setError]                 = useState(null);
  const [chatMessages, setChatMessages]   = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const sock = connectSocket(token);
    socketRef.current = sock;

    sock.on('connect',    () => { setConnected(true); setError(null); sounds.connect(); });
    sock.on('disconnect', () => setConnected(false));

    sock.on(EVENTS.ROOM_CREATED, ({ code }) => setRoomCode(code));
    sock.on(EVENTS.ROOM_JOINED,  ({ code }) => setRoomCode(code));
    sock.on(EVENTS.PLAYER_LIST,  (list)     => setPlayers(list));

    sock.on(EVENTS.GAME_STARTED,      () => {});
    sock.on(EVENTS.GAME_STATE_UPDATE, (state) => {
      setGameState(prev => {
        // Sound cues based on phase transitions
        if (prev && state.phase !== prev.phase) {
          if (state.phase === 'MINE')  sounds.mine();
          if (state.phase === 'CABO_RESOLUTION') sounds.cabo();
          if (state.phase === 'ROUND_END' || state.phase === 'GAME_OVER') sounds.win();
        }
        return state;
      });
    });

    sock.on(EVENTS.MINE_WINDOW_OPEN,  ({ expiresAt }) => {
      setMineWindow({ expiresAt });
      sounds.mine();
    });
    sock.on(EVENTS.MINE_WINDOW_CLOSE, () => setMineWindow(null));

    sock.on(EVENTS.MINE_RESULT, () => setMineWindow(null));
    sock.on(EVENTS.ELIM_RESULT, (result) => {
      setLastElimResult(result);
      if (result.success) sounds.win(); else sounds.fail();
    });

    sock.on(EVENTS.CHAT_MSG, (msg) => setChatMessages(prev => [...prev.slice(-99), msg]));

    sock.on(EVENTS.ERROR,  ({ message }) => setError(message));
    sock.on(EVENTS.KICKED, ({ reason })  => { setError(reason); disconnectSocket(); });

    return () => {
      sock.off('connect');
      sock.off('disconnect');
      Object.values(EVENTS).forEach(ev => sock.off(ev));
    };
  }, [token]);

  const send = useCallback((event, payload) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const createRoom = useCallback(() => send(EVENTS.CREATE_ROOM), [send]);
  const joinRoom   = useCallback((code) => send(EVENTS.JOIN_ROOM, { code }), [send]);
  const sendReady  = useCallback((ready = true) => send(EVENTS.PLAYER_READY, { ready }), [send]);
  const startGame  = useCallback(() => send(EVENTS.START_GAME), [send]);
  const sendChat   = useCallback((message) => send(EVENTS.CHAT_SEND, { message }), [send]);

  return {
    connected, roomCode, players, gameState,
    mineWindow, lastElimResult, error, chatMessages,
    createRoom, joinRoom, sendReady, startGame, send, sendChat,
  };
}

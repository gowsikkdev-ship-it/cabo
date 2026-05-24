/**
 * App root — supports two modes:
 *   offline  — hot-seat, local reducer, no server (Phase 4)
 *   online   — socket-authoritative, phases 5-9
 *
 * The user chooses at the AuthScreen. Token is persisted in sessionStorage so
 * a page refresh can reconnect automatically.
 */

import React, { useReducer, useState, useCallback, useEffect } from 'react';
import * as engine from '@shared/gameEngine.js';
import { PHASES, POWER_TYPES } from '@shared/constants.js';
import { EVENTS } from '@shared/events.js';

// Screens
import AuthScreen         from './components/AuthScreen.jsx';
import LobbyScreen        from './components/LobbyScreen.jsx';
import SetupScreen        from './components/SetupScreen.jsx';
import InitialRevealScreen from './components/InitialRevealScreen.jsx';
import GameBoard          from './components/GameBoard.jsx';
import ScoreBoard         from './components/ScoreBoard.jsx';
import GameOverScreen     from './components/GameOverScreen.jsx';
import ConnectionBadge    from './components/ConnectionBadge.jsx';

// Socket hook
import useGameSocket from './hooks/useGameSocket.js';

// ── Offline reducer (Phase 4 hot-seat) ────────────────────────────────────────

function gameReducer(state, action) {
  if (!state) {
    if (action.type === 'START_GAME') return engine.createInitialState(action.playerNames);
    return null;
  }
  switch (action.type) {
    case 'PLAYER_READY':         return engine.playerReady(state, action.playerId);
    case 'CALL_CABO':            return engine.callCabo(state);
    case 'DRAW_CARD':            return engine.drawCard(state);
    case 'ACTION_SWAP':          return engine.actionSwap(state, action.position);
    case 'ACTION_USE_POWER':     return engine.actionUsePower(state);
    case 'ACTION_DISCARD':       return engine.actionDiscard(state);
    case 'ACTION_ELIMINATE':     return engine.actionEliminate(state, action.targetPlayerId, action.position);
    case 'POWER_SELECT':         return engine.powerSelect(state, action.targetPlayerId, action.position);
    case 'POWER_CONFIRM_REVEAL': return engine.powerConfirmReveal(state);
    case 'POWER_SWAP_SECOND':    return engine.powerSwapSecond(state, action.targetPlayerId, action.position);
    case 'CALL_MINE':            return engine.callMine(state, action.playerId);
    case 'MINE_NO_CALL':         return engine.mineNoCall(state);
    case 'MINE_EXCHANGE':        return engine.mineExchange(state, action.position);
    case 'MINE_SELF_ELIM':       return engine.mineSelfElim(state, action.position);
    case 'MINE_OPP_ELIM':        return engine.mineOppElim(state, action.targetPlayerId, action.position);
    case 'RESOLVE_CABO':         return engine.resolveCabo(state);
    case 'START_NEW_ROUND':      return engine.startNewRound(state);
    case 'FORCE_END':            return engine.forceEndGame(state);
    default:                     return state;
  }
}

// ── OfflineGame — wraps Phase 4 hot-seat flow ─────────────────────────────────

function OfflineGame({ onExit }) {
  const [gameState, dispatch] = useReducer(gameReducer, null);
  const [uiMode, setUiMode]   = useState(null);
  const resetUiMode = useCallback(() => setUiMode(null), []);

  function selectCardForAction(playerId, position) {
    if (!gameState) return;
    const gs = gameState;

    if (uiMode === 'swap') {
      const active = gs.players[gs.currentTurnIndex];
      if (playerId !== active.id) return;
      dispatch({ type: 'ACTION_SWAP', position });
      resetUiMode();
      return;
    }
    if (gs.phase === PHASES.POWER_SELECT) {
      dispatch({ type: 'POWER_SELECT', targetPlayerId: playerId, position });
      return;
    }
    if (gs.phase === PHASES.POWER_SWAP_SECOND) {
      dispatch({ type: 'POWER_SWAP_SECOND', targetPlayerId: playerId, position });
      return;
    }
    if (uiMode === 'mine_exchange') {
      if (playerId !== gs.mineWinner) return;
      dispatch({ type: 'MINE_EXCHANGE', position });
      resetUiMode();
      return;
    }
    if (uiMode === 'mine_self_elim') {
      if (playerId !== gs.mineWinner) return;
      dispatch({ type: 'MINE_SELF_ELIM', position });
      resetUiMode();
      return;
    }
    if (uiMode === 'mine_opp_elim') {
      if (playerId === gs.mineWinner) return;
      dispatch({ type: 'MINE_OPP_ELIM', targetPlayerId: playerId, position });
      resetUiMode();
      return;
    }
    if (uiMode === 'self_elim') {
      dispatch({ type: 'ACTION_ELIMINATE', targetPlayerId: playerId, position });
      resetUiMode();
      return;
    }
  }

  if (!gameState) return <SetupScreen onStart={(names) => dispatch({ type: 'START_GAME', playerNames: names })} onBack={onExit} />;

  const { phase } = gameState;

  if (phase === PHASES.INITIAL_REVEAL) {
    return <InitialRevealScreen gameState={gameState} onReady={(id) => dispatch({ type: 'PLAYER_READY', playerId: id })} />;
  }
  if (phase === PHASES.ROUND_OVER) {
    return <ScoreBoard gameState={gameState} onNextRound={() => { dispatch({ type: 'START_NEW_ROUND' }); resetUiMode(); }} />;
  }
  if (phase === PHASES.GAME_OVER) {
    return <GameOverScreen gameState={gameState} onNewGame={() => { dispatch({ type: 'RESET' }); resetUiMode(); }} />;
  }

  return (
    <GameBoard
      gameState={gameState}
      uiMode={uiMode}
      myPlayerId={null}
      onSelectCard={selectCardForAction}
      onCallCabo={() => dispatch({ type: 'CALL_CABO' })}
      onDrawCard={() => dispatch({ type: 'DRAW_CARD' })}
      onBeginSwap={() => setUiMode('swap')}
      onUsePower={() => dispatch({ type: 'ACTION_USE_POWER' })}
      onDiscardDrawn={() => dispatch({ type: 'ACTION_DISCARD' })}
      onBeginSelfElim={() => setUiMode('self_elim')}
      onConfirmReveal={() => dispatch({ type: 'POWER_CONFIRM_REVEAL' })}
      onCallMine={(pid) => dispatch({ type: 'CALL_MINE', playerId: pid })}
      onMineNoCall={() => dispatch({ type: 'MINE_NO_CALL' })}
      onBeginMineExchange={() => setUiMode('mine_exchange')}
      onBeginMineSelfElim={() => setUiMode('mine_self_elim')}
      onBeginMineOppElim={() => setUiMode('mine_opp_elim')}
      onResolveCabo={() => dispatch({ type: 'RESOLVE_CABO' })}
      onCancelUiMode={resetUiMode}
      onEndGame={() => dispatch({ type: 'FORCE_END' })}
    />
  );
}

// ── OnlineGame — socket-authoritative (Phases 5-9) ────────────────────────────

function OnlineGame({ token, myPlayerId, onExit }) {
  const {
    connected, roomCode, players, gameState,
    mineWindow, lastElimResult, error,
    createRoom, joinRoom, sendReady, startGame, send,
  } = useGameSocket(token, myPlayerId);

  const [uiMode, setUiMode] = useState(null);
  const resetUiMode = useCallback(() => setUiMode(null), []);

  // Store roomCode in sessionStorage for reconnection
  useEffect(() => {
    if (roomCode) sessionStorage.setItem('cabo_room', roomCode);
  }, [roomCode]);

  // Reconnect attempt on mount if we have a stored room
  useEffect(() => {
    const savedRoom = sessionStorage.getItem('cabo_room');
    if (savedRoom && connected) {
      send(EVENTS.RECONNECT, { code: savedRoom, token });
    }
  }, [connected]);

  function selectCardForAction(playerId, position) {
    if (!gameState) return;

    if (uiMode === 'swap') {
      const active = gameState.players[gameState.currentTurnIndex];
      if (active.id !== myPlayerId) return; // safety
      send(EVENTS.ACTION_SWAP, { position });
      resetUiMode();
      return;
    }
    if (gameState.phase === PHASES.POWER_SELECT) {
      send(EVENTS.POWER_SELECT, { targetPlayerId: playerId, position });
      return;
    }
    if (gameState.phase === PHASES.POWER_SWAP_SECOND) {
      send(EVENTS.POWER_SWAP_SECOND, { targetPlayerId: playerId, position });
      return;
    }
    if (uiMode === 'mine_exchange') {
      send(EVENTS.MINE_EXCHANGE, { position });
      resetUiMode();
      return;
    }
    if (uiMode === 'mine_self_elim') {
      send(EVENTS.MINE_SELF_ELIM, { position });
      resetUiMode();
      return;
    }
    if (uiMode === 'mine_opp_elim') {
      send(EVENTS.MINE_OPP_ELIM, { targetPlayerId: playerId, position });
      resetUiMode();
      return;
    }
    if (uiMode === 'self_elim') {
      send(EVENTS.ACTION_ELIMINATE, { targetPlayerId: playerId, position });
      resetUiMode();
      return;
    }
  }

  const isMyTurn = gameState
    ? gameState.players[gameState.currentTurnIndex]?.id === myPlayerId
    : false;

  // Lobby screen — before game starts
  if (!gameState) {
    return (
      <>
        <ConnectionBadge connected={connected} />
        <LobbyScreen
          connected={connected}
          roomCode={roomCode}
          players={players}
          myPlayerId={myPlayerId}
          error={error}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onReady={sendReady}
          onStart={startGame}
          onBack={onExit}
        />
      </>
    );
  }

  const { phase } = gameState;

  if (phase === PHASES.INITIAL_REVEAL) {
    return (
      <>
        <ConnectionBadge connected={connected} />
        <InitialRevealScreen
          gameState={gameState}
          myPlayerId={myPlayerId}
          onReady={() => send(EVENTS.PLAYER_READY, { ready: true })}
        />
      </>
    );
  }

  if (phase === PHASES.ROUND_OVER) {
    return (
      <>
        <ConnectionBadge connected={connected} />
        <ScoreBoard
          gameState={gameState}
          onNextRound={() => send(EVENTS.START_NEW_ROUND)}
          isMyTurn={isMyTurn}
        />
      </>
    );
  }

  if (phase === PHASES.GAME_OVER) {
    return (
      <>
        <ConnectionBadge connected={connected} />
        <GameOverScreen
          gameState={gameState}
          onNewGame={() => { sessionStorage.removeItem('cabo_room'); onExit(); }}
        />
      </>
    );
  }

  return (
    <>
      <ConnectionBadge connected={connected} />
      <GameBoard
        gameState={gameState}
        uiMode={uiMode}
        myPlayerId={myPlayerId}
        mineWindow={mineWindow}
        lastElimResult={lastElimResult}
        onSelectCard={selectCardForAction}
        onCallCabo={() => send(EVENTS.CALL_CABO)}
        onDrawCard={() => send(EVENTS.DRAW_CARD)}
        onBeginSwap={() => setUiMode('swap')}
        onUsePower={() => send(EVENTS.ACTION_USE_POWER)}
        onDiscardDrawn={() => send(EVENTS.ACTION_DISCARD)}
        onBeginSelfElim={() => setUiMode('self_elim')}
        onConfirmReveal={() => send(EVENTS.POWER_CONFIRM_REVEAL)}
        onCallMine={() => send(EVENTS.CALL_MINE)}
        onMineNoCall={() => send(EVENTS.MINE_NO_CALL)}
        onBeginMineExchange={() => setUiMode('mine_exchange')}
        onBeginMineSelfElim={() => setUiMode('mine_self_elim')}
        onBeginMineOppElim={() => setUiMode('mine_opp_elim')}
        onResolveCabo={() => send(EVENTS.RESOLVE_CABO)}
        onCancelUiMode={resetUiMode}
        onEndGame={() => send(EVENTS.FORCE_END_GAME)}
      />
    </>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  // null | { token, userId, name }
  const [auth, setAuth] = useState(() => {
    try {
      const raw = sessionStorage.getItem('cabo_auth');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  // 'auth' | 'offline' | 'online'
  const [appMode, setAppMode] = useState(auth ? 'online' : 'auth');

  function handleAuth(result) {
    sessionStorage.setItem('cabo_auth', JSON.stringify(result));
    setAuth(result);
    setAppMode('online');
  }

  function handleOffline() {
    setAppMode('offline');
  }

  function handleExit() {
    setAppMode('auth');
  }

  if (appMode === 'offline') {
    return <OfflineGame onExit={handleExit} />;
  }

  if (appMode === 'online' && auth) {
    return (
      <OnlineGame
        token={auth.token}
        myPlayerId={auth.userId}
        onExit={handleExit}
      />
    );
  }

  return <AuthScreen onAuth={handleAuth} onOffline={handleOffline} />;
}

import React, { useState } from 'react';
import { PHASES, POSITIONS, POWER_TYPES } from '@shared/constants.js';
import Card from './Card.jsx';
import PlayerHand from './PlayerHand.jsx';
import ActionPanel from './ActionPanel.jsx';
import PowerPanel from './PowerPanel.jsx';
import MinePhasePanel from './MinePhasePanel.jsx';
import MineActionPanel from './MineActionPanel.jsx';
import MineCountdown from './MineCountdown.jsx';
import FlyingCard from './FlyingCard.jsx';
import ChatPanel from './ChatPanel.jsx';

export default function GameBoard({
  gameState,
  uiMode,
  myPlayerId = null,
  mineWindow = null,
  lastElimResult = null,
  chatMessages = [],
  onSelectCard,
  onCallCabo,
  onDrawCard,
  onBeginSwap,
  onUsePower,
  onDiscardDrawn,
  onBeginSelfElim,
  onConfirmReveal,
  onCallMine,
  onMineNoCall,
  onBeginMineExchange,
  onBeginMineSelfElim,
  onBeginMineOppElim,
  onResolveCabo,
  onCancelUiMode,
  onEndGame,
  onSendChat,
}) {
  const { phase, players, currentTurnIndex, discardPile, drawnCard, mineWinner, swapFirst, powerPending } = gameState;
  const deckCount = gameState.deckCount ?? gameState.deck?.length ?? 0;
  const activePlayer = players[currentTurnIndex];
  const topDiscard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const revealAll = phase === PHASES.CABO_RESOLUTION;

  const isMyTurn    = myPlayerId === null || activePlayer.id === myPlayerId;
  const isMineWinner = myPlayerId === null || mineWinner === myPlayerId;
  const [chatOpen, setChatOpen] = useState(false);
  const [prevMsgCount, setPrevMsgCount] = useState(0);
  const unread = chatOpen ? 0 : chatMessages.length - prevMsgCount;

  function openChat() { setPrevMsgCount(chatMessages.length); setChatOpen(true); }
  function closeChat() { setPrevMsgCount(chatMessages.length); setChatOpen(false); }

  // Split players into top (opponents) and bottom (me / first players)
  let topPlayers, bottomPlayers;
  if (myPlayerId !== null) {
    bottomPlayers = players.filter(p => p.id === myPlayerId);
    topPlayers    = players.filter(p => p.id !== myPlayerId);
  } else {
    // Offline hot-seat: first half bottom, second half top
    const split = Math.ceil(players.length / 2);
    bottomPlayers = players.slice(0, split);
    topPlayers    = players.slice(split);
  }

  function allPositions(player) { return Object.keys(player.cards); }

  function getClickablePositions(player) {
    const all    = allPositions(player);
    const nonNull = pos => player.cards[pos] !== null && player.cards[pos]?.hidden !== true;
    const exists  = pos => player.cards[pos] !== null;

    if (phase === PHASES.ACTION && uiMode === 'swap' && player.id === activePlayer.id && isMyTurn)
      return all.filter(nonNull);
    if (phase === PHASES.ACTION && uiMode === 'self_elim' && isMyTurn)
      return all.filter(pos => player.cards[pos] !== null);
    if (phase === PHASES.POWER_SELECT && powerPending && isMyTurn) {
      const type = powerPending.type;
      if (type === POWER_TYPES.SELF_VIEW) return all.filter(nonNull);
      if (type === POWER_TYPES.OPPONENT_VIEW && player.id !== activePlayer.id) return all.filter(exists);
      if (type === POWER_TYPES.SWAP) return all.filter(exists);
    }
    if (phase === PHASES.POWER_SWAP_SECOND && swapFirst && isMyTurn)
      return all.filter(exists);
    if (phase === PHASES.MINE_ACTION && isMineWinner) {
      if (uiMode === 'mine_exchange'  && player.id === mineWinner) return all.filter(nonNull);
      if (uiMode === 'mine_self_elim' && player.id === mineWinner) return all.filter(nonNull);
      if (uiMode === 'mine_opp_elim'  && player.id !== mineWinner) return all.filter(exists);
    }
    return [];
  }

  function getHighlightedPositions(player) {
    if (swapFirst?.playerId === player.id) return [swapFirst.position];
    return [];
  }

  const phaseBannerText = {
    [PHASES.DRAW]:              `${activePlayer.name}'s Turn`,
    [PHASES.ACTION]:            `${activePlayer.name} — Choose Action`,
    [PHASES.POWER_SELECT]:      `${activePlayer.name}'s Power — Pick a Card`,
    [PHASES.POWER_REVEAL]:      'Power — Viewing card…',
    [PHASES.POWER_SWAP_SECOND]: 'Power Swap — Pick Second Card',
    [PHASES.MINE]:              'Mine Phase!',
    [PHASES.MINE_ACTION]:       `Mine — ${players.find(p => p.id === mineWinner)?.name} Won`,
    [PHASES.CABO_RESOLUTION]:   'CABO! — Cards Revealed',
  }[phase] ?? phase;

  function renderHand(p, flipped = false) {
    return (
      <PlayerHand
        key={p.id}
        player={p}
        isActive={p.id === activePlayer.id}
        isMineWinner={p.id === mineWinner}
        flipped={flipped}
        drawnCard={p.id === activePlayer.id ? drawnCard : null}
        revealAll={revealAll}
        clickablePositions={getClickablePositions(p)}
        highlightedPositions={getHighlightedPositions(p)}
        swapFirst={swapFirst}
        onCardClick={onSelectCard}
      />
    );
  }

  return (
    <div className="game-board" style={{ position: 'relative' }}>
      <FlyingCard lastAction={gameState.lastAction} />

      {/* Chat panel (floating, right edge) */}
      {chatOpen && onSendChat && (
        <ChatPanel
          messages={chatMessages}
          myPlayerId={myPlayerId}
          onSend={onSendChat}
          onClose={closeChat}
        />
      )}

      {/* Top bar */}
      <div className="board-top">
        <span className="phase-banner">{phaseBannerText}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Round {gameState.roundNumber}
        </span>
        {onSendChat && (
          <button
            className="btn btn-outline"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', position: 'relative' }}
            onClick={chatOpen ? closeChat : openChat}
          >
            Chat
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: '#ef4444', color: '#fff', borderRadius: '999px',
                fontSize: '0.6rem', padding: '0 4px', lineHeight: '16px', minWidth: '16px', textAlign: 'center',
              }}>{unread}</span>
            )}
          </button>
        )}
        {onEndGame && (
          <button
            className="btn btn-outline"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', opacity: 0.65 }}
            onClick={onEndGame}
          >
            End Game
          </button>
        )}
      </div>

      {/* Table — symmetrical layout */}
      <div className="board-table">
        {/* Opponents row (top) */}
        {topPlayers.length > 0 && (
          <div className="table-row">
            {topPlayers.map(p => renderHand(p, true))}
          </div>
        )}

        {/* Center piles — deck + discard */}
        <div className="table-piles">
          <div style={{ textAlign: 'center' }}>
            <p className="pile-label">Deck</p>
            <div className="deck-stack">
              <div className="card face-down" data-ref="deck" style={{ cursor: 'default' }} />
            </div>
            <p className="deck-count">{deckCount} cards</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p className="pile-label">Discard</p>
            {topDiscard
              ? <Card card={topDiscard} faceUp dataRef="discard" />
              : <div className="card empty" data-ref="discard" />
            }
          </div>

          {/* Compact game log */}
          <div className="log-panel" style={{ maxWidth: '150px', alignSelf: 'center' }}>
            {gameState.log.slice(-4).reverse().map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        </div>

        {/* Bottom row (me / first players) */}
        <div className="table-row">
          {bottomPlayers.map(renderHand)}
        </div>
      </div>

      {/* Action controls */}
      <div className="board-bottom">
        {phase === PHASES.CABO_RESOLUTION && (
          <div className="panel" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div className="cabo-badge">CABO!</div>
            <p style={{ margin: '0.5rem 0 1rem' }}>
              {players.find(p => p.id === gameState.caboCaller)?.name} called Cabo — all cards revealed.
            </p>
            <button className="btn btn-primary" onClick={onResolveCabo}>Calculate Scores</button>
          </div>
        )}

        {phase === PHASES.MINE_ACTION && (
          <MineActionPanel
            gameState={gameState} uiMode={uiMode} myPlayerId={myPlayerId}
            onBeginMineExchange={onBeginMineExchange}
            onBeginMineSelfElim={onBeginMineSelfElim}
            onBeginMineOppElim={onBeginMineOppElim}
            onCancelUiMode={onCancelUiMode}
          />
        )}

        {phase === PHASES.MINE && (
          <MinePhasePanel
            gameState={gameState} myPlayerId={myPlayerId}
            mineWindow={mineWindow} onCallMine={onCallMine} onMineNoCall={onMineNoCall}
          />
        )}

        {(phase === PHASES.DRAW || phase === PHASES.ACTION) && isMyTurn && (
          <ActionPanel
            gameState={gameState} uiMode={uiMode}
            onCallCabo={onCallCabo} onDrawCard={onDrawCard}
            onBeginSwap={onBeginSwap} onUsePower={onUsePower}
            onDiscardDrawn={onDiscardDrawn} onBeginSelfElim={onBeginSelfElim}
            onCancelUiMode={onCancelUiMode}
          />
        )}
        {(phase === PHASES.DRAW || phase === PHASES.ACTION) && !isMyTurn && (
          <div className="panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>
            Waiting for <strong>{activePlayer.name}</strong>…
          </div>
        )}

        {(phase === PHASES.POWER_SELECT || phase === PHASES.POWER_REVEAL || phase === PHASES.POWER_SWAP_SECOND) && (
          <PowerPanel gameState={gameState} onConfirmReveal={onConfirmReveal} />
        )}
      </div>
    </div>
  );
}

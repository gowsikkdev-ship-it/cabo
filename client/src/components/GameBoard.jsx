import React from 'react';
import { PHASES, POSITIONS, POWER_TYPES } from '@shared/constants.js';
import Card from './Card.jsx';
import PlayerHand from './PlayerHand.jsx';
import ActionPanel from './ActionPanel.jsx';
import PowerPanel from './PowerPanel.jsx';
import MinePhasePanel from './MinePhasePanel.jsx';
import MineActionPanel from './MineActionPanel.jsx';
import MineCountdown from './MineCountdown.jsx';

export default function GameBoard({
  gameState,
  uiMode,
  myPlayerId = null,
  mineWindow = null,
  lastElimResult = null,
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
}) {
  const { phase, players, currentTurnIndex, discardPile, drawnCard, mineWinner, swapFirst, powerPending } = gameState;
  // deck may be an array (offline) or absent (server replaces with deckCount)
  const deckCount = gameState.deckCount ?? gameState.deck?.length ?? 0;
  const activePlayer = players[currentTurnIndex];
  const topDiscard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const revealAll = phase === PHASES.CABO_RESOLUTION;

  // Online: only active player sees action controls for their turn
  const isMyTurn = myPlayerId === null || activePlayer.id === myPlayerId;
  const isMineWinner = myPlayerId === null || mineWinner === myPlayerId;

  // All position keys for a player (base grid + penalty overflow P1/P2/...)
  function allPositions(player) {
    return Object.keys(player.cards);
  }

  // Determine which cards are clickable for each player
  function getClickablePositions(player) {
    const all = allPositions(player);
    const nonNull = pos => player.cards[pos] !== null && player.cards[pos]?.hidden !== true;
    const exists  = pos => player.cards[pos] !== null;

    if (phase === PHASES.ACTION && uiMode === 'swap' && player.id === activePlayer.id && isMyTurn) {
      return all.filter(nonNull);
    }
    if (phase === PHASES.ACTION && uiMode === 'self_elim' && player.id === activePlayer.id && isMyTurn) {
      return all.filter(nonNull);
    }
    if (phase === PHASES.POWER_SELECT && powerPending && isMyTurn) {
      const type = powerPending.type;
      if (type === POWER_TYPES.SELF_VIEW) return all.filter(nonNull);
      if (type === POWER_TYPES.OPPONENT_VIEW && player.id !== activePlayer.id) return allPositions(player).filter(exists);
      if (type === POWER_TYPES.SWAP) return allPositions(player).filter(exists);
    }
    if (phase === PHASES.POWER_SWAP_SECOND && swapFirst && isMyTurn) {
      return allPositions(player).filter(exists);
    }
    if (phase === PHASES.MINE_ACTION && isMineWinner) {
      if (uiMode === 'mine_exchange' && player.id === mineWinner) return all.filter(nonNull);
      if (uiMode === 'mine_self_elim' && player.id === mineWinner) return all.filter(nonNull);
      if (uiMode === 'mine_opp_elim' && player.id !== mineWinner) return allPositions(player).filter(exists);
    }
    return [];
  }

  function getHighlightedPositions(player) {
    if (swapFirst?.playerId === player.id) return [swapFirst.position];
    return [];
  }

  const phaseBannerText = {
    [PHASES.DRAW]:            `${activePlayer.name}'s Turn — Draw Phase`,
    [PHASES.ACTION]:          `${activePlayer.name}'s Turn — Action Phase`,
    [PHASES.POWER_SELECT]:    `${activePlayer.name}'s Power — Select Target`,
    [PHASES.POWER_REVEAL]:    'Power — Private View (waiting…)',
    [PHASES.POWER_SWAP_SECOND]: 'Power Swap — Select Second Card',
    [PHASES.MINE]:            'Mine Phase — React Now!',
    [PHASES.MINE_ACTION]:     `Mine Won by ${players.find(p => p.id === mineWinner)?.name}`,
    [PHASES.CABO_RESOLUTION]: 'CABO! — All Cards Revealed',
  }[phase] ?? phase;

  const lastMove = gameState.lastMove ?? null;

  return (
    <div className="game-board">
      {/* Top bar */}
      <div className="board-top">
        <span className="phase-banner">{phaseBannerText}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Round {gameState.roundNumber}
        </span>
      </div>

      {/* Last action flash */}
      {lastMove && (
        <div style={{
          background: 'rgba(212,160,23,0.12)',
          border: '1px solid rgba(212,160,23,0.25)',
          borderRadius: '6px',
          padding: '0.35rem 0.75rem',
          fontSize: '0.78rem',
          color: 'var(--gold-light)',
          margin: '0 0 0.5rem',
          textAlign: 'center',
        }}>
          {lastMove}
        </div>
      )}

      {/* Center: players + piles */}
      <div className="board-center">
        <div className="players-grid">
          {players.map(p => {
            const clickable = getClickablePositions(p);
            const highlighted = getHighlightedPositions(p);
            return (
              <PlayerHand
                key={p.id}
                player={p}
                isActive={p.id === activePlayer.id}
                isMineWinner={p.id === mineWinner}
                revealAll={revealAll}
                clickablePositions={clickable}
                highlightedPositions={highlighted}
                swapFirst={swapFirst}
                onCardClick={onSelectCard}
              />
            );
          })}
        </div>

        {/* Deck and discard */}
        <div className="center-zone">
          <div>
            <p className="pile-label">Deck</p>
            <div className="card face-down" style={{ cursor: 'default' }} />
            <p className="deck-count">{deckCount} cards</p>
          </div>

          <div>
            <p className="pile-label">Discard</p>
            {topDiscard ? (
              <Card card={topDiscard} faceUp />
            ) : (
              <div className="card empty" />
            )}
          </div>

          {/* Game log (last 4 entries) */}
          <div className="log-panel" style={{ minWidth: '140px', maxWidth: '160px' }}>
            {gameState.log.slice(-4).reverse().map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: action controls */}
      <div className="board-bottom">
        {/* Cabo resolution */}
        {phase === PHASES.CABO_RESOLUTION && (
          <div className="panel" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            <div className="cabo-badge">CABO!</div>
            <p style={{ margin: '0.5rem 0 1rem' }}>
              {players.find(p => p.id === gameState.caboCaller)?.name} has called Cabo. All cards are now revealed above.
            </p>
            <button className="btn btn-primary" onClick={onResolveCabo}>
              Calculate Scores
            </button>
          </div>
        )}

        {/* Mine action panel */}
        {phase === PHASES.MINE_ACTION && (
          <MineActionPanel
            gameState={gameState}
            uiMode={uiMode}
            myPlayerId={myPlayerId}
            onBeginMineExchange={onBeginMineExchange}
            onBeginMineSelfElim={onBeginMineSelfElim}
            onBeginMineOppElim={onBeginMineOppElim}
            onCancelUiMode={onCancelUiMode}
          />
        )}

        {/* Mine phase panel */}
        {phase === PHASES.MINE && (
          <MinePhasePanel
            gameState={gameState}
            myPlayerId={myPlayerId}
            mineWindow={mineWindow}
            onCallMine={onCallMine}
            onMineNoCall={onMineNoCall}
          />
        )}

        {/* Draw/Action panel — only shown to the active player */}
        {(phase === PHASES.DRAW || phase === PHASES.ACTION) && isMyTurn && (
          <ActionPanel
            gameState={gameState}
            uiMode={uiMode}
            onCallCabo={onCallCabo}
            onDrawCard={onDrawCard}
            onBeginSwap={onBeginSwap}
            onUsePower={onUsePower}
            onDiscardDrawn={onDiscardDrawn}
            onBeginSelfElim={onBeginSelfElim}
            onCancelUiMode={onCancelUiMode}
          />
        )}
        {/* Waiting indicator for non-active players */}
        {(phase === PHASES.DRAW || phase === PHASES.ACTION) && !isMyTurn && (
          <div className="panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>
            Waiting for <strong>{activePlayer.name}</strong> to take their turn…
          </div>
        )}

        {/* Power panels */}
        {(phase === PHASES.POWER_SELECT || phase === PHASES.POWER_REVEAL || phase === PHASES.POWER_SWAP_SECOND) && (
          <PowerPanel gameState={gameState} onConfirmReveal={onConfirmReveal} />
        )}
      </div>
    </div>
  );
}

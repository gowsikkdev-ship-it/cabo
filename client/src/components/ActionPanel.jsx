import React from 'react';
import { POWER_TYPES } from '@shared/constants.js';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@shared/cards.js';
import Card from './Card.jsx';

export default function ActionPanel({ gameState, uiMode, onCallCabo, onDrawCard, onBeginSwap, onUsePower, onDiscardDrawn, onCancelUiMode }) {
  const { phase, drawnCard, players, currentTurnIndex } = gameState;
  const activePlayer = players[currentTurnIndex];

  if (phase === 'DRAW') {
    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>{activePlayer.name}'s Turn</h3>
        <div className="flex-row">
          <button className="btn btn-primary" onClick={onDrawCard}>Draw Card</button>
          <button className="btn btn-outline" onClick={onCallCabo}>Call Cabo!</button>
        </div>
        <p className="mt-sm">Draw a card, or call Cabo if you think you have the lowest hand.</p>
      </div>
    );
  }

  if (phase === 'ACTION' && drawnCard) {
    const hasPower = drawnCard.power !== POWER_TYPES.NONE;

    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Choose Action</h3>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Drawn Card</p>
            <Card card={drawnCard} faceUp large />
          </div>
          <div style={{ flex: 1 }}>
            {hasPower && (
              <div style={{ background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '6px', padding: '0.4rem 0.6rem', marginBottom: '0.5rem', fontSize: '0.78rem', color: 'var(--gold-light)' }}>
                Power: {drawnCard.power === POWER_TYPES.SELF_VIEW ? 'View any face-down card'
                       : drawnCard.power === POWER_TYPES.OPPONENT_VIEW ? "View opponent's card"
                       : 'Swap any two cards'}
              </div>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {uiMode === 'swap' ? 'Click one of your cards to replace it.' : 'Choose what to do with this card.'}
            </p>
          </div>
        </div>

        {uiMode === 'swap' ? (
          <div className="flex-row">
            <button className="btn btn-outline" onClick={onCancelUiMode}>Cancel Swap</button>
          </div>
        ) : (
          <div className="flex-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={onBeginSwap}>Swap with My Card</button>
            {hasPower && (
              <button className="btn btn-success" onClick={onUsePower}>Use Power</button>
            )}
            <button className="btn btn-outline" onClick={onDiscardDrawn}>Discard</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'CABO_RESOLUTION') {
    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div className="cabo-badge">CABO!</div>
        <p style={{ marginTop: '0.5rem' }}>
          {gameState.players.find(p => p.id === gameState.caboCaller)?.name} has called Cabo.
          All cards are now revealed.
        </p>
        <button className="btn btn-primary mt-md" onClick={() => {}}>Calculate Scores</button>
      </div>
    );
  }

  return null;
}

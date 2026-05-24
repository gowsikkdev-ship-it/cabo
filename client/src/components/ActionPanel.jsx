import React from 'react';
import { POWER_TYPES } from '@shared/constants.js';
import Card from './Card.jsx';

export default function ActionPanel({ gameState, uiMode, onCallCabo, onDrawCard, onBeginSwap, onUsePower, onDiscardDrawn, onBeginSelfElim, onCancelUiMode }) {
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

    if (uiMode === 'swap') {
      return (
        <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Swap — Select Your Card</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Click one of <strong>{activePlayer.name}</strong>'s face-down cards to replace it with the drawn card.
          </p>
          <button className="btn btn-outline" onClick={onCancelUiMode}>Cancel</button>
        </div>
      );
    }

    if (uiMode === 'self_elim') {
      return (
        <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Eliminate — Select Your Card</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Click one of your face-down cards. If its value matches the drawn card ({drawnCard.rank} = {drawnCard.value} pts), both are removed. Otherwise the drawn card is added to your hand.
          </p>
          <button className="btn btn-outline" onClick={onCancelUiMode}>Cancel</button>
        </div>
      );
    }

    return (
      <div className="panel" style={{ maxWidth: '420px', width: '100%' }}>
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
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose what to do with this card.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={onBeginSwap}>Swap with My Card</button>
            {hasPower && (
              <button className="btn btn-success" onClick={onUsePower}>Use Power</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-danger" onClick={onBeginSelfElim} title="Try to match this card against one of your own — removes both on success">
              Eliminate
            </button>
            <button className="btn btn-outline" onClick={onDiscardDrawn}>
              Discard
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          <strong>Eliminate:</strong> match drawn card vs your own → both removed on success, drawn card added to hand on fail.<br />
          <strong>Discard:</strong> throw away drawn card (no effect).
        </p>
      </div>
    );
  }

  return null;
}

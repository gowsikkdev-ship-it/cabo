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
        <div className="panel" style={{ maxWidth: '460px', width: '100%' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Swap — Click Your Card to Replace</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Drawn card (goes in)</p>
              <Card card={drawnCard} faceUp large />
            </div>
            <div style={{ fontSize: '1.8rem', color: 'var(--gold-light)' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Your card (click it above)</p>
              <div style={{ width: '56px', height: '80px', border: '2px dashed var(--gold-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-light)', fontSize: '1.4rem' }}>?</div>
            </div>
            <div style={{ fontSize: '1.8rem', color: 'var(--text-muted)' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Your old card (discarded)</p>
              <div style={{ width: '56px', height: '80px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', padding: '4px' }}>goes to discard pile</div>
            </div>
          </div>
          <button className="btn btn-outline" onClick={onCancelUiMode}>Cancel</button>
        </div>
      );
    }

    if (uiMode === 'self_elim') {
      return (
        <div className="panel" style={{ maxWidth: '460px', width: '100%' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Eliminate — Click Any Card to Match</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Drawn card (value {drawnCard.value})</p>
              <Card card={drawnCard} faceUp large />
            </div>
            <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <p>Click <strong style={{ color: 'var(--gold-light)' }}>any face-down card</strong> — own or opponent's.</p>
              <p style={{ marginTop: '0.4rem' }}>✓ Match → that card removed, drawn card discarded</p>
              <p>✗ No match → drawn card added to your hand</p>
            </div>
          </div>
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

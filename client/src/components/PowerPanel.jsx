import React from 'react';
import { POWER_TYPES } from '@shared/constants.js';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@shared/cards.js';
import Card from './Card.jsx';

export default function PowerPanel({ gameState, onConfirmReveal }) {
  const { phase, powerPending, powerReveal, swapFirst, players, currentTurnIndex } = gameState;
  const activePlayer = players[currentTurnIndex];

  if (phase === 'POWER_SELECT' && powerPending) {
    const type = powerPending.type;
    let instruction = '';
    if (type === POWER_TYPES.SELF_VIEW)     instruction = 'Click any face-down card to view it privately.';
    if (type === POWER_TYPES.OPPONENT_VIEW) instruction = "Click any opponent's face-down card to view it privately.";
    if (type === POWER_TYPES.SWAP)          instruction = 'Click the first card you want to swap.';

    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>
          {type === POWER_TYPES.SELF_VIEW ? 'Self View' :
           type === POWER_TYPES.OPPONENT_VIEW ? 'Opponent View' : 'Swap Cards'}
        </h3>
        <p>{instruction}</p>
      </div>
    );
  }

  if (phase === 'POWER_SWAP_SECOND' && swapFirst) {
    const fp = players.find(p => p.id === swapFirst.playerId);
    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Swap — Select Second Card</h3>
        <p>First: <strong style={{ color: 'var(--gold-light)' }}>{fp?.name} {swapFirst.position}</strong></p>
        <p style={{ marginTop: '0.25rem' }}>Now click the second card to complete the swap.</p>
      </div>
    );
  }

  if (phase === 'POWER_REVEAL' && !powerReveal) {
    // Non-viewer sees a waiting message while the active player views privately
    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--gold-light)' }}>{activePlayer.name}</strong> is privately viewing a card…
      </div>
    );
  }

  if (phase === 'POWER_REVEAL' && powerReveal) {
    const { card } = powerReveal;
    const color = SUIT_COLORS[card.suit];
    const symbol = SUIT_SYMBOLS[card.suit];
    const targetPlayer = players.find(p => p.id === powerReveal.targetPlayerId);

    return (
      <div className="overlay">
        <div className="overlay-box">
          <h2>Private View</h2>
          <p style={{ fontSize: '0.82rem' }}>
            Only <strong style={{ color: 'var(--gold-light)' }}>{activePlayer.name}</strong> can see this.
            {targetPlayer && targetPlayer.id !== activePlayer.id && (
              <> This is <strong>{targetPlayer.name}</strong>'s <strong>{powerReveal.position}</strong> card.</>
            )}
          </p>
          <Card card={card} faceUp large />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Value: <strong style={{ color: 'var(--gold-light)' }}>{card.value} pts</strong>
          </p>
          <button className="btn btn-primary" onClick={onConfirmReveal}>
            I've Seen It — Continue
          </button>
        </div>
      </div>
    );
  }

  return null;
}

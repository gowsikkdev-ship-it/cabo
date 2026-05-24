import React, { useState } from 'react';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@shared/cards.js';

export default function InitialRevealScreen({ gameState, onReady }) {
  const [revealed, setRevealed] = useState(false);
  const revealingIdx = gameState.revealingPlayerIndex;
  const player = gameState.players[revealingIdx];
  const readyCount = gameState.players.filter(p => p.ready).length;
  const total = gameState.players.length;

  function handleReveal() {
    setRevealed(true);
  }

  function handleReady() {
    setRevealed(false);
    onReady(player.id);
  }

  if (!revealed) {
    return (
      <div className="overlay" style={{ position: 'fixed' }}>
        <div className="overlay-box">
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {readyCount}/{total} players ready
            </p>
          </div>
          <h2>Pass device to</h2>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)' }}>
            {player.name}
          </div>
          <p>You will privately view your <strong>Bottom Left</strong> and <strong>Bottom Right</strong> cards. Memorize them!</p>
          <button className="btn btn-primary" style={{ minWidth: '180px' }} onClick={handleReveal}>
            Tap to View Cards
          </button>
        </div>
      </div>
    );
  }

  const blCard = player.cards.BL;
  const brCard = player.cards.BR;

  return (
    <div className="overlay" style={{ position: 'fixed' }}>
      <div className="overlay-box">
        <h2>{player.name}'s Cards</h2>
        <p style={{ fontSize: '0.8rem' }}>Memorize these — they will flip face down!</p>

        <div className="flex-row" style={{ justifyContent: 'center', gap: '1.5rem' }}>
          {[['BL', blCard], ['BR', brCard]].map(([label, card]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {label === 'BL' ? 'Bottom Left' : 'Bottom Right'}
              </p>
              <div className="card card-lg face-up" style={{ margin: '0 auto' }}>
                <span className="card-rank" style={{ color: card ? SUIT_COLORS[card.suit] : '#999' }}>
                  {card?.rank ?? '?'}
                </span>
                <span className="card-suit" style={{ color: card ? SUIT_COLORS[card.suit] : '#999' }}>
                  {card ? SUIT_SYMBOLS[card.suit] : ''}
                </span>
                {card && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {card.value} pts
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-success" style={{ minWidth: '180px' }} onClick={handleReady}>
          I've Memorized Them — Ready
        </button>
      </div>
    </div>
  );
}

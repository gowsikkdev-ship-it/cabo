import React from 'react';
import Card from './Card.jsx';
import { POSITIONS } from '@shared/constants.js';
import { getHandValue } from '@shared/gameEngine.js';

export default function PlayerHand({
  player,
  isActive,
  isMineWinner,
  revealAll = false,
  clickablePositions = [],
  selectedPositions = [],
  highlightedPositions = [],
  swapFirst = null,
  onCardClick,
}) {
  const extraCards = player.extraCards ?? [];
  const hasPenaltyCards = extraCards.length > 0;

  return (
    <div className="player-area">
      <div className="flex-row" style={{ marginBottom: '0.5rem', gap: '0.4rem' }}>
        <span className={`player-name ${isActive ? 'active' : ''}`}>{player.name}</span>
        {isActive     && <span className="tag active">Your Turn</span>}
        {isMineWinner && <span className="tag mine-winner">Mine Winner</span>}
        {hasPenaltyCards && (
          <span className="tag" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            +{extraCards.length} penalty
          </span>
        )}
      </div>

      {/* Fixed 2×2 grid */}
      <div className="hand-grid">
        {POSITIONS.map(pos => {
          const card = player.cards[pos];
          const isClickable = clickablePositions.includes(pos);
          const isSelected =
            selectedPositions.includes(pos) ||
            (swapFirst?.playerId === player.id && swapFirst?.position === pos);
          const isHighlighted = highlightedPositions.includes(pos);

          if (card === null) {
            return <Card key={pos} position={pos} empty />;
          }

          return (
            <Card
              key={pos}
              card={card}
              position={pos}
              faceUp={revealAll}
              clickable={isClickable}
              selected={isSelected}
              highlighted={isHighlighted}
              onClick={() => onCardClick?.(player.id, pos)}
            />
          );
        })}
      </div>

      {/* Overflow penalty cards (beyond the fixed 4-card grid) */}
      {hasPenaltyCards && (
        <div style={{ marginTop: '6px' }}>
          <p style={{ fontSize: '0.65rem', color: '#f87171', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Penalty cards
          </p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {extraCards.map((card, i) => (
              <Card
                key={`extra-${i}`}
                card={card}
                faceUp={revealAll}
                position={`P${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {revealAll && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Total: <strong style={{ color: 'var(--gold-light)' }}>{getHandValue(player)} pts</strong>
          {hasPenaltyCards && (
            <span style={{ color: '#f87171', marginLeft: '4px' }}>
              (incl. {extraCards.reduce((s, c) => s + c.value, 0)} penalty pts)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

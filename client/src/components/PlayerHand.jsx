import React from 'react';
import Card from './Card.jsx';
import { POSITIONS } from '@shared/constants.js';
import { getHandValue } from '@shared/gameEngine.js';

export default function PlayerHand({
  player,
  isActive,
  isMineWinner,
  drawnCard = null,
  revealAll = false,
  clickablePositions = [],
  selectedPositions = [],
  highlightedPositions = [],
  swapFirst = null,
  onCardClick,
}) {
  // Penalty overflow positions are any keys not in the base POSITIONS set
  const penaltyPositions = Object.keys(player.cards).filter(k => !POSITIONS.includes(k));
  const hasPenaltyCards  = penaltyPositions.length > 0;

  function renderCard(pos) {
    const card = player.cards[pos];
    const isClickable   = clickablePositions.includes(pos);
    const isSelected    =
      selectedPositions.includes(pos) ||
      (swapFirst?.playerId === player.id && swapFirst?.position === pos);
    const isHighlighted = highlightedPositions.includes(pos);
    const slotRef = `slot-${player.id}-${pos}`;

    if (card === null) return <Card key={pos} position={pos} dataRef={slotRef} empty />;

    return (
      <Card
        key={`${pos}-${card.rank}-${card.suit}`}
        card={card}
        position={pos}
        dataRef={slotRef}
        faceUp={revealAll}
        clickable={isClickable}
        selected={isSelected}
        highlighted={isHighlighted}
        onClick={() => onCardClick?.(player.id, pos)}
      />
    );
  }

  return (
    <div className="player-area" data-ref={`player-${player.id}`}>
      <div className="flex-row" style={{ marginBottom: '0.5rem', gap: '0.4rem' }}>
        <span className={`player-name ${isActive ? 'active' : ''}`}>{player.name}</span>
        {isActive      && <span className="tag active">Your Turn</span>}
        {isMineWinner  && <span className="tag mine-winner">Mine Winner</span>}
        {hasPenaltyCards && (
          <span className="tag" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            +{penaltyPositions.length} penalty
          </span>
        )}
      </div>

      {/* Fixed 2×2 base grid + drawn card zone side by side when active */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div className="hand-grid">
          {POSITIONS.map(pos => renderCard(pos))}
        </div>

        {/* Drawn card zone — always in DOM when active so animation can target it */}
        {isActive && (
          <div className="drawn-card-zone" data-ref="drawn-card">
            <span className="drawn-card-zone-label">Drawn</span>
            {drawnCard
              ? <Card card={drawnCard} faceUp />
              : <div className="drawn-card-placeholder" />
            }
          </div>
        )}
      </div>

      {/* Penalty overflow cards — fully clickable like any other card */}
      {hasPenaltyCards && (
        <div style={{ marginTop: '6px' }}>
          <p style={{ fontSize: '0.65rem', color: '#f87171', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Penalty cards
          </p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {penaltyPositions.map(pos => renderCard(pos))}
          </div>
        </div>
      )}

      {revealAll && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Total: <strong style={{ color: 'var(--gold-light)' }}>{getHandValue(player)} pts</strong>
        </div>
      )}
    </div>
  );
}

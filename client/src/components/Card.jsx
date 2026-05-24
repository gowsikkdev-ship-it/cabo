import React from 'react';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@shared/cards.js';

export default function Card({
  card,
  position,
  faceUp = false,
  clickable = false,
  selected = false,
  highlighted = false,
  empty = false,
  large = false,
  onClick,
}) {
  // Server-sanitized hidden card — treat as face-down
  const isHidden = card?.hidden === true;
  if (isHidden) faceUp = false;

  if (empty) {
    return (
      <div
        className={`card empty${large ? ' card-lg' : ''}`}
        title={position ? `Slot ${position} (empty)` : 'Empty slot'}
      >
        {position && <span className="card-pos">{position}</span>}
      </div>
    );
  }

  const classes = [
    'card',
    faceUp ? 'face-up' : 'face-down',
    clickable ? 'clickable' : '',
    selected ? 'selected' : '',
    highlighted ? 'highlight' : '',
    large ? 'card-lg' : '',
  ].filter(Boolean).join(' ');

  if (!faceUp) {
    return (
      <div className={classes} onClick={clickable ? onClick : undefined} title={position}>
        {position && <span className="card-pos">{position}</span>}
      </div>
    );
  }

  const color = card ? SUIT_COLORS[card.suit] : '#000';
  const symbol = card ? SUIT_SYMBOLS[card.suit] : '';

  return (
    <div className={classes} onClick={clickable ? onClick : undefined}>
      {position && <span className="card-pos">{position}</span>}
      <span className="card-rank" style={{ color }}>{card?.rank ?? '?'}</span>
      <span className="card-suit" style={{ color }}>{symbol}</span>
    </div>
  );
}

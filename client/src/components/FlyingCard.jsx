import React, { useEffect, useRef, useState } from 'react';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@shared/cards.js';

export default function FlyingCard({ lastAction }) {
  const [animations, setAnimations] = useState([]);
  const prevIdRef = useRef(null);

  useEffect(() => {
    if (!lastAction || lastAction.id === prevIdRef.current) return;
    prevIdRef.current = lastAction.id;

    const newAnims = [];
    for (const move of lastAction.moves) {
      const fromEl = document.querySelector(`[data-ref="${move.fromRef}"]`);
      const toEl   = document.querySelector(`[data-ref="${move.toRef}"]`);
      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect   = toEl.getBoundingClientRect();

      const startX = fromRect.left + fromRect.width  / 2 - 28;
      const startY = fromRect.top  + fromRect.height / 2 - 40;
      const dx = (toRect.left + toRect.width  / 2 - 28) - startX;
      const dy = (toRect.top  + toRect.height / 2 - 40) - startY;

      newAnims.push({
        key: `${lastAction.id}-${move.fromRef}-${move.toRef}`,
        startX, startY, dx, dy,
        card: move.card,
        faceUp: move.faceUp,
      });
    }

    if (newAnims.length === 0) return;
    setAnimations(newAnims);
    const t = setTimeout(() => setAnimations([]), 800);
    return () => clearTimeout(t);
  }, [lastAction?.id]);

  if (animations.length === 0) return null;

  return (
    <div className="flying-card-overlay">
      {animations.map(anim => {
        const color  = anim.card ? SUIT_COLORS[anim.card.suit] : '#000';
        const symbol = anim.card ? SUIT_SYMBOLS[anim.card.suit] : '';
        return (
          <div
            key={anim.key}
            className={`flying-card ${anim.faceUp ? 'face-up' : 'face-down'}`}
            style={{ left: anim.startX, top: anim.startY, '--dx': `${anim.dx}px`, '--dy': `${anim.dy}px` }}
          >
            {anim.faceUp && anim.card && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color, fontSize: '0.85rem', fontWeight: 700, lineHeight: 1 }}>{anim.card.rank}</span>
                <span style={{ color, fontSize: '0.7rem', lineHeight: 1 }}>{symbol}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

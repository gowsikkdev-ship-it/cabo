import React, { useState } from 'react';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@shared/cards.js';

// ── Online mode — each player sees only their own cards ───────────────────────
function OnlineReveal({ player, readyCount, total, onReady }) {
  const [revealed, setRevealed] = useState(false);
  const alreadyReady = player?.ready;

  if (alreadyReady) {
    return (
      <div className="overlay" style={{ position: 'fixed' }}>
        <div className="overlay-box" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--gold-light)' }}>You're ready!</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Waiting for other players… ({readyCount}/{total} ready)
          </p>
        </div>
      </div>
    );
  }

  if (!revealed) {
    return (
      <div className="overlay" style={{ position: 'fixed' }}>
        <div className="overlay-box" style={{ textAlign: 'center' }}>
          <h2>Welcome, {player?.name}!</h2>
          <p>You may privately view your <strong>Bottom Left</strong> and <strong>Bottom Right</strong> cards. Memorize them — they will flip face-down!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {readyCount}/{total} players ready
          </p>
          <button className="btn btn-primary" style={{ minWidth: '180px' }} onClick={() => setRevealed(true)}>
            View My Cards
          </button>
        </div>
      </div>
    );
  }

  const blCard = player?.cards?.BL;
  const brCard = player?.cards?.BR;

  return (
    <div className="overlay" style={{ position: 'fixed' }}>
      <div className="overlay-box">
        <h2>{player?.name}'s Cards</h2>
        <p style={{ fontSize: '0.8rem' }}>Memorize these!</p>
        <CardPair blCard={blCard} brCard={brCard} />
        <button className="btn btn-success" style={{ minWidth: '180px' }} onClick={onReady}>
          I've Memorized Them — Ready!
        </button>
      </div>
    </div>
  );
}

// ── Offline mode — pass device to each player in turn ────────────────────────
function OfflineReveal({ gameState, onReady }) {
  const [revealed, setRevealed] = useState(false);
  const revealingIdx = gameState.revealingPlayerIndex;
  const player = gameState.players[revealingIdx];
  const readyCount = gameState.players.filter(p => p.ready).length;
  const total = gameState.players.length;

  function handleReady() {
    setRevealed(false);
    onReady(player.id);
  }

  if (!revealed) {
    return (
      <div className="overlay" style={{ position: 'fixed' }}>
        <div className="overlay-box" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{readyCount}/{total} players ready</p>
          <h2>Pass device to</h2>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold)' }}>{player.name}</div>
          <p>You will privately view your <strong>Bottom Left</strong> and <strong>Bottom Right</strong> cards.</p>
          <button className="btn btn-primary" style={{ minWidth: '180px' }} onClick={() => setRevealed(true)}>
            Tap to View Cards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" style={{ position: 'fixed' }}>
      <div className="overlay-box">
        <h2>{player.name}'s Cards</h2>
        <p style={{ fontSize: '0.8rem' }}>Memorize these — they will flip face down!</p>
        <CardPair blCard={player.cards.BL} brCard={player.cards.BR} />
        <button className="btn btn-success" style={{ minWidth: '180px' }} onClick={handleReady}>
          I've Memorized Them — Ready
        </button>
      </div>
    </div>
  );
}

// ── Shared card display ───────────────────────────────────────────────────────
function CardPair({ blCard, brCard }) {
  return (
    <div className="flex-row" style={{ justifyContent: 'center', gap: '1.5rem', margin: '1rem 0' }}>
      {[['BL', 'Bottom Left', blCard], ['BR', 'Bottom Right', brCard]].map(([label, name, card]) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{name}</p>
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
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function InitialRevealScreen({ gameState, myPlayerId = null, onReady }) {
  const readyCount = gameState.players.filter(p => p.ready).length;
  const total = gameState.players.length;

  if (myPlayerId) {
    const me = gameState.players.find(p => p.id === myPlayerId);
    return <OnlineReveal player={me} readyCount={readyCount} total={total} onReady={onReady} />;
  }

  return <OfflineReveal gameState={gameState} onReady={onReady} />;
}

import React, { useState } from 'react';
import { MIN_PLAYERS, MAX_PLAYERS } from '@shared/constants.js';

export default function SetupScreen({ onStart }) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['Player 1', 'Player 2', '', '', '', '']);

  function updateName(i, val) {
    const n = [...names];
    n[i] = val;
    setNames(n);
  }

  function handleStart() {
    const playerNames = names.slice(0, count).map((n, i) => n.trim() || `Player ${i + 1}`);
    onStart(playerNames);
  }

  return (
    <div className="screen">
      <div style={{ textAlign: 'center' }}>
        <h1>CABO</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Realtime hidden-information card game</p>
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: '1rem' }}>Game Setup</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
            Number of Players
          </label>
          <div className="flex-row">
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                className={`btn btn-sm ${count === n ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-form">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="player-input-row">
              <span className="player-index">{i + 1}.</span>
              <input
                type="text"
                placeholder={`Player ${i + 1}`}
                value={names[i]}
                onChange={e => updateName(i, e.target.value)}
                maxLength={20}
              />
            </div>
          ))}
        </div>

        <button className="btn btn-primary w-full" style={{ marginTop: '1.25rem' }} onClick={handleStart}>
          Start Game
        </button>
      </div>

      <div className="panel" style={{ maxWidth: '480px', opacity: 0.8 }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Quick Rules</h3>
        <p>Lowest total card value wins. King=0, Ace=1, 2-10=face, Jack=11, Queen=12.</p>
        <p style={{ marginTop: '0.4rem' }}>Each turn: Draw → Action (Swap/Power/Discard) → Mine phase.</p>
        <p style={{ marginTop: '0.4rem' }}>Call <strong style={{ color: 'var(--gold)' }}>Cabo</strong> when you think you have the lowest hand.</p>
      </div>
    </div>
  );
}

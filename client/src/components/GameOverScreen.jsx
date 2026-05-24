import React from 'react';

export default function GameOverScreen({ gameState, onNewGame }) {
  const { players, cumulativeScores } = gameState;
  const sorted = [...players].sort((a, b) => (cumulativeScores[a.id] ?? 0) - (cumulativeScores[b.id] ?? 0));
  const winner = sorted[0];

  return (
    <div className="screen">
      <div style={{ textAlign: 'center' }}>
        <div className="cabo-badge" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>GAME OVER</div>
        <h2 style={{ color: '#4ade80' }}>{winner.name} Wins!</h2>
        <p style={{ marginTop: '0.25rem' }}>Lowest cumulative score takes the match.</p>
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: '0.75rem' }}>Final Standings</h3>
        {sorted.map((p, i) => {
          const score = cumulativeScores[p.id] ?? 0;
          const isWinner = p.id === winner.id;
          const isEliminated = score >= 100;
          return (
            <div key={p.id} className="score-row">
              <div className="flex-row" style={{ gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '24px' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span style={{ fontWeight: 600, color: isWinner ? '#4ade80' : 'inherit' }}>{p.name}</span>
              </div>
              <span style={{ fontWeight: 700, color: isEliminated ? '#f87171' : isWinner ? '#4ade80' : 'var(--text-light)' }}>
                {score} pts
                {isEliminated ? ' (eliminated)' : ''}
              </span>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary" style={{ minWidth: '200px' }} onClick={onNewGame}>
        Play Again
      </button>
    </div>
  );
}

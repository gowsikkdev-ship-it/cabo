import React from 'react';
import { getHandValue } from '@shared/gameEngine.js';

export default function ScoreBoard({ gameState, onNextRound }) {
  const { players, roundScores, cumulativeScores, caboSuccess, caboCaller, handValues, roundNumber } = gameState;
  const caller = players.find(p => p.id === caboCaller);

  const sorted = [...players].sort((a, b) => (cumulativeScores[a.id] ?? 0) - (cumulativeScores[b.id] ?? 0));
  const leader = sorted[0];

  return (
    <div className="screen">
      <div style={{ textAlign: 'center' }}>
        <h2>Round {roundNumber - 1} Over</h2>
        {caller && (
          <p style={{ marginTop: '0.25rem' }}>
            {caller.name} called Cabo —{' '}
            <strong style={{ color: caboSuccess ? '#4ade80' : '#f87171' }}>
              {caboSuccess ? 'Successful!' : 'Failed (50 pt penalty)'}
            </strong>
          </p>
        )}
      </div>

      {/* Card values revealed */}
      {handValues && (
        <div className="panel">
          <h3 style={{ marginBottom: '0.75rem' }}>Final Hand Values</h3>
          {players.map(p => (
            <div key={p.id} className="score-row">
              <div>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  {Object.entries(p.cards)
                    .filter(([, c]) => c !== null)
                    .map(([pos, c]) => `${pos}:${c.rank}`)
                    .join(' ')}
                </span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--gold-light)' }}>{handValues[p.id]} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Round scores */}
      {roundScores && (
        <div className="panel">
          <h3 style={{ marginBottom: '0.75rem' }}>Round Scores</h3>
          {players.map(p => {
            const rs = roundScores[p.id];
            const isBonus = rs === 0;
            const isPenalty = rs >= 50;
            return (
              <div key={p.id} className="score-row">
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: isBonus ? '#4ade80' : isPenalty ? '#f87171' : 'var(--text-light)' }}>
                  +{rs}
                  {isPenalty && rs === 50 ? ' (failed Cabo)' : isBonus ? ' (winner)' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Cumulative scores */}
      <div className="panel">
        <h3 style={{ marginBottom: '0.75rem' }}>Cumulative Scores (first to 100 loses)</h3>
        {sorted.map((p, i) => {
          const score = cumulativeScores[p.id] ?? 0;
          const isLeader = p.id === leader.id;
          return (
            <div key={p.id} className="score-row">
              <div className="flex-row" style={{ gap: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{i + 1}</span>
                <span className={isLeader ? 'score-winner' : ''}>{p.name}</span>
                {isLeader && <span className="tag active">Leading</span>}
              </div>
              <span className={score >= 100 ? 'score-loser' : isLeader ? 'score-winner' : ''} style={{ fontWeight: 700 }}>
                {score} pts
              </span>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary" style={{ minWidth: '200px' }} onClick={onNextRound}>
        Start Next Round
      </button>
    </div>
  );
}

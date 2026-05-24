import React from 'react';
import Card from './Card.jsx';

export default function MineActionPanel({
  gameState,
  uiMode,
  onBeginMineExchange,
  onBeginMineSelfElim,
  onBeginMineOppElim,
  onCancelUiMode,
}) {
  const { mineWinner, mineChainMode, discardPile, players } = gameState;
  const winner = players.find(p => p.id === mineWinner);
  const discard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const canExchange = mineChainMode !== 'elimination';

  if (!winner) return null;

  if (uiMode === 'mine_exchange') {
    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Exchange — Select Your Card</h3>
        <p>Click one of <strong style={{ color: 'var(--gold-light)' }}>{winner.name}</strong>'s cards to swap with the discard.</p>
        <button className="btn btn-outline mt-md" onClick={onCancelUiMode}>Cancel</button>
      </div>
    );
  }

  if (uiMode === 'mine_self_elim') {
    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Self Elimination</h3>
        <p>Click one of <strong style={{ color: 'var(--gold-light)' }}>{winner.name}</strong>'s cards. If its value matches the discard, both are removed!</p>
        {discard && (
          <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Discard value: <strong style={{ color: 'var(--gold-light)' }}>{discard.value}</strong>
          </p>
        )}
        <button className="btn btn-outline mt-md" onClick={onCancelUiMode}>Cancel</button>
      </div>
    );
  }

  if (uiMode === 'mine_opp_elim') {
    return (
      <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Opponent Elimination</h3>
        <p>Click any opponent's face-down card. If it matches the discard value, it is removed!</p>
        {discard && (
          <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Discard value: <strong style={{ color: 'var(--gold-light)' }}>{discard.value} </strong> (result is hidden until resolved)
          </p>
        )}
        <button className="btn btn-outline mt-md" onClick={onCancelUiMode}>Cancel</button>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: '400px', width: '100%' }}>
      <h3 style={{ marginBottom: '0.25rem' }}>Mine Won!</h3>
      <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
        <strong style={{ color: 'var(--gold-light)' }}>{winner.name}</strong> called Mine first. Choose an action:
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          disabled={!canExchange}
          onClick={onBeginMineExchange}
          title={!canExchange ? 'Exchange not allowed after elimination in this chain' : ''}
        >
          Exchange
        </button>
        <button className="btn btn-danger" onClick={onBeginMineSelfElim}>
          Self Elimination
        </button>
        <button className="btn btn-outline" onClick={onBeginMineOppElim}>
          Opponent Elimination
        </button>
      </div>

      {!canExchange && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#f87171' }}>
          Exchange locked — elimination was used earlier in this Mine chain.
        </p>
      )}
    </div>
  );
}

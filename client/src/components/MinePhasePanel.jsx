import React from 'react';
import Card from './Card.jsx';
import MineCountdown from './MineCountdown.jsx';

/**
 * Mine phase panel.
 *
 * Offline (myPlayerId=null): buttons for each eligible player.
 * Online (myPlayerId set, mineWindow provided): single "Mine!" button for the
 * current player if they are eligible and the window is open.
 *
 * Eligibility rule: a player cannot call Mine if they were the last one to
 * perform an exchange or elimination (mineLastActedBy). They must wait for
 * another player to act first. The active player can never call Mine.
 */
export default function MinePhasePanel({ gameState, myPlayerId = null, mineWindow = null, onCallMine, onMineNoCall }) {
  const { players, currentTurnIndex, discardPile, mineChainMode, mineLastActedBy = null } = gameState;
  const activePlayer = players[currentTurnIndex];
  const discard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  // Active player is blocked in the initial window (they put the first discard there).
  // Once the chain starts (mineChainMode set), the discard has changed so they're eligible too.
  const candidatePlayers = mineChainMode
    ? players
    : players.filter(p => p.id !== activePlayer.id);
  const eligiblePlayers  = candidatePlayers.filter(p => p.id !== mineLastActedBy);
  const cooldownPlayer   = players.filter(p => p.id !== activePlayer.id).find(p => p.id === mineLastActedBy) ?? null;

  const isOnline    = myPlayerId !== null && mineWindow !== null;
  const windowOpen  = mineWindow !== null;
  const iAmEligible = isOnline && eligiblePlayers.some(p => p.id === myPlayerId);
  const iAmActive   = myPlayerId === activePlayer.id;
  const iAmCooldown = myPlayerId === mineLastActedBy;

  return (
    <div className="panel" style={{ maxWidth: '480px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p className="pile-label">Open Discard</p>
          {discard ? <Card card={discard} faceUp large /> : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: '0.25rem' }}>Mine Phase</h3>
          {mineChainMode === 'elimination' && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: '#f87171', marginBottom: '0.4rem' }}>
              Elimination chain — Exchange no longer allowed
            </div>
          )}
          <p style={{ fontSize: '0.82rem' }}>
            {isOnline
              ? (iAmCooldown
                  ? 'You just acted — wait for another player to Mine first.'
                  : iAmEligible
                    ? 'Call Mine! before the window closes!'
                    : iAmActive
                      ? 'Waiting for other players to react…'
                      : 'No eligible players.')
              : (eligiblePlayers.length > 0
                  ? 'Non-active players may call Mine! to react to this discard.'
                  : 'No eligible players — end the turn.')}
          </p>
        </div>
      </div>

      {/* Live countdown (online mode only) */}
      {isOnline && windowOpen && (
        <MineCountdown expiresAt={mineWindow.expiresAt} />
      )}

      {/* Online mode — single button for the current user if eligible */}
      {isOnline && iAmEligible && windowOpen && (
        <button className="btn btn-mine w-full" style={{ marginBottom: '0.5rem' }} onClick={() => onCallMine()}>
          Mine!
        </button>
      )}

      {/* Offline mode — button per eligible player */}
      {!isOnline && eligiblePlayers.length > 0 && (
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {eligiblePlayers.map(p => (
            <button key={p.id} className="btn btn-mine" onClick={() => onCallMine(p.id)}>
              {p.name}: Mine!
            </button>
          ))}
        </div>
      )}

      {cooldownPlayer && (
        <div style={{ marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          On cooldown (just acted): <strong>{cooldownPlayer.name}</strong>
        </div>
      )}

      {/* Offline: explicit end-turn button. Online: active player sees this when no window */}
      {(!isOnline || (iAmActive && !windowOpen)) && (
        <button className="btn btn-outline w-full" onClick={onMineNoCall}>
          No Mine — End Turn
        </button>
      )}
    </div>
  );
}

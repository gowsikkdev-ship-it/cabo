import React, { useState } from 'react';
import ConnectionBadge from './ConnectionBadge.jsx';

export default function LobbyScreen({
  connected, roomCode, players, myPlayerId,
  error, onCreateRoom, onJoinRoom, onReady, onStart, onBack,
}) {
  const [joinCode, setJoinCode] = useState('');

  const myEntry = players.find(p => p.id === myPlayerId);
  const isHost  = players.length > 0 && players[0]?.id === myPlayerId;
  const allReady = players.length >= 2 && players.every(p => p.ready);

  function handleJoin(e) {
    e.preventDefault();
    if (joinCode.trim().length === 6) onJoinRoom(joinCode.trim().toUpperCase());
  }

  if (!roomCode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="panel" style={{ maxWidth: '380px', width: '100%' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--gold-light)' }}>CABO — Lobby</h2>

          {!connected && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Connecting to server…
            </div>
          )}

          {error && (
            <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>
          )}

          <button className="btn btn-primary w-full" onClick={onCreateRoom} disabled={!connected}>
            Create Room
          </button>

          <div style={{ textAlign: 'center', margin: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>or</div>

          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="6-letter code"
              value={joinCode}
              maxLength={6}
              style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.15em' }}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
            />
            <button className="btn btn-outline" type="submit" disabled={!connected || joinCode.length !== 6}>
              Join
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={onBack}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ color: 'var(--gold-light)' }}>Room</h2>
          <span style={{
            fontFamily: 'monospace', fontSize: '1.4rem', letterSpacing: '0.2em',
            color: 'var(--gold-light)', background: 'rgba(212,175,55,0.1)',
            padding: '0.25rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.3)',
          }}>
            {roomCode}
          </span>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Share the room code with friends. 2-6 players.
        </p>

        {error && (
          <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          {players.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 0.6rem', borderRadius: '6px', marginBottom: '0.3rem',
              background: p.id === myPlayerId ? 'rgba(212,175,55,0.08)' : 'transparent',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: p.connected !== false ? '#4ade80' : '#f87171' }} />
              <span style={{ flex: 1, fontWeight: p.id === myPlayerId ? 600 : 400 }}>
                {p.name} {p.id === myPlayerId && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(you)</span>}
              </span>
              <span style={{ fontSize: '0.75rem', color: p.ready ? '#4ade80' : 'var(--text-muted)' }}>
                {p.ready ? 'Ready' : 'Not ready'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-row" style={{ gap: '0.5rem' }}>
          <button
            className={`btn ${myEntry?.ready ? 'btn-outline' : 'btn-primary'}`}
            style={{ flex: 1 }}
            onClick={() => onReady(!myEntry?.ready)}
          >
            {myEntry?.ready ? 'Not Ready' : 'Ready'}
          </button>

          {isHost && (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={!allReady}
              onClick={onStart}
            >
              Start Game
            </button>
          )}
        </div>

        {isHost && !allReady && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
            Waiting for all players to ready up…
          </p>
        )}
      </div>
    </div>
  );
}

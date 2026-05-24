import React, { useState } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export default function AuthScreen({ onAuth, onOffline }) {
  const [tab, setTab]         = useState('guest'); // 'guest' | 'login' | 'register'
  const [name, setName]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  async function post(path, body) {
    const res = await fetch(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Request failed');
    return data;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let result;
      if (tab === 'guest')    result = await post('/auth/guest',    { name });
      if (tab === 'login')    result = await post('/auth/login',    { username, password });
      if (tab === 'register') result = await post('/auth/register', { username, password });
      onAuth(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ maxWidth: '360px', width: '100%' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem', color: 'var(--gold-light)' }}>
          CABO
        </h1>

        <div className="flex-row" style={{ gap: '0.5rem', marginBottom: '1.5rem' }}>
          {['guest', 'login', 'register'].map(t => (
            <button
              key={t}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, fontSize: '0.8rem' }}
              onClick={() => { setTab(t); setError(null); }}
            >
              {t === 'guest' ? 'Guest' : t === 'login' ? 'Log In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tab === 'guest' ? (
            <input
              className="input"
              placeholder="Display name"
              value={name}
              maxLength={24}
              required
              onChange={e => setName(e.target.value)}
            />
          ) : (
            <>
              <input
                className="input"
                placeholder="Username"
                value={username}
                maxLength={32}
                required
                autoComplete="username"
                onChange={e => setUsername(e.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={password}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                onChange={e => setPassword(e.target.value)}
              />
            </>
          )}

          {error && (
            <div style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>
          )}

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : tab === 'guest' ? 'Play Online' : tab === 'login' ? 'Log In' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={onOffline}>
            Play Offline (Hot-seat)
          </button>
        </div>
      </div>
    </div>
  );
}

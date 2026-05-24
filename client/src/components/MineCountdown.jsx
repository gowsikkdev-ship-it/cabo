import React, { useState, useEffect } from 'react';

/**
 * Displays a live countdown bar for the Mine reaction window.
 * Props:
 *   expiresAt  — server timestamp (ms) when the window closes
 *   onExpired  — callback when local timer hits zero
 */
export default function MineCountdown({ expiresAt, onExpired }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
      if (left === 0) onExpired?.();
    };
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const total   = 2000; // MINE_WINDOW_MS
  const pct     = Math.min(100, (remaining / total) * 100);
  const urgent  = pct < 40;

  return (
    <div style={{ width: '100%', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
        <span>Mine window</span>
        <span style={{ color: urgent ? '#f87171' : 'var(--text-muted)' }}>
          {(remaining / 1000).toFixed(1)}s
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '3px',
          background: urgent ? '#ef4444' : 'var(--gold-light)',
          transition: 'width 50ms linear, background 300ms',
        }} />
      </div>
    </div>
  );
}

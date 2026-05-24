import React, { useState, useEffect } from 'react';

/**
 * Small indicator in the top-right corner showing connection status (Phase 11).
 */
export default function ConnectionBadge({ connected }) {
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    if (!connected) {
      const t = setTimeout(() => setShowReconnecting(true), 1500);
      return () => clearTimeout(t);
    }
    setShowReconnecting(false);
  }, [connected]);

  if (connected) return null; // hidden when healthy

  return (
    <div style={{
      position: 'fixed', top: '0.75rem', right: '0.75rem',
      padding: '0.3rem 0.7rem', borderRadius: '999px',
      background: showReconnecting ? 'rgba(239,68,68,0.2)' : 'rgba(250,204,21,0.15)',
      border: `1px solid ${showReconnecting ? 'rgba(239,68,68,0.5)' : 'rgba(250,204,21,0.4)'}`,
      color: showReconnecting ? '#f87171' : '#fbbf24',
      fontSize: '0.72rem',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
    }}>
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: showReconnecting ? '#f87171' : '#fbbf24',
        animation: 'pulse 1s infinite',
      }} />
      {showReconnecting ? 'Disconnected' : 'Connecting…'}
    </div>
  );
}

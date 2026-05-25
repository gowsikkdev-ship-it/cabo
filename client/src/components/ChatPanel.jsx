import React, { useState, useEffect, useRef } from 'react';

export default function ChatPanel({ messages = [], myPlayerId, onSend, onClose }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>Chat</span>
        <button className="chat-close" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">No messages yet…</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.playerId === myPlayerId ? 'chat-msg-mine' : ''}`}>
            <span className="chat-name">{msg.name}</span>
            <span className="chat-text">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="input"
          style={{ flex: 1, fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          maxLength={200}
        />
        <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }} onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}

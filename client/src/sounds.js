/**
 * Web Audio API sound effects (Phase 11).
 * All sounds are synthesised — no external files required.
 * Silently no-ops if AudioContext is unavailable (e.g., test environments).
 */

let ctx = null;

function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(frequency, type, duration, gainValue = 0.25, delayMs = 0) {
  const c = getCtx();
  if (!c) return;
  setTimeout(() => {
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    gain.gain.setValueAtTime(gainValue, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }, delayMs);
}

export const sounds = {
  draw()    { tone(440, 'sine',     0.12); },
  discard() { tone(300, 'triangle', 0.10); },
  swap()    { tone(520, 'sine', 0.10); tone(660, 'sine', 0.10, 0.2, 90); },
  mine()    {
    tone(880, 'square',   0.06, 0.3);
    tone(660, 'sawtooth', 0.12, 0.2, 60);
    tone(440, 'sine',     0.20, 0.15, 130);
  },
  cabo() {
    tone(523, 'sine', 0.15);
    tone(659, 'sine', 0.15, 0.25, 150);
    tone(784, 'sine', 0.25, 0.3, 300);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.4, 0.3, i * 180));
  },
  fail()    { tone(200, 'sawtooth', 0.3, 0.3); },
  connect() { tone(600, 'sine', 0.08, 0.15); },
};

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  playerReady,
  callCabo,
  drawCard,
  actionSwap,
  actionUsePower,
  actionDiscard,
  powerSelect,
  powerConfirmReveal,
  powerSwapSecond,
  callMine,
  mineNoCall,
  mineExchange,
  mineSelfElim,
  mineOppElim,
  resolveCabo,
  startNewRound,
  getActivePlayer,
  getTopDiscard,
  getHandValue,
} from '../shared/gameEngine.js';
import { PHASES, POSITIONS, POWER_TYPES, FAILED_CABO_PENALTY } from '../shared/constants.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeState(names = ['Alice', 'Bob']) {
  return createInitialState(names);
}

// Advance all players through initial reveal so game enters DRAW phase
function skipInitialReveal(state) {
  let s = state;
  for (const p of state.players) {
    s = playerReady(s, p.id);
  }
  return s;
}

// Force a specific card into a player's position (for deterministic tests)
function injectCard(state, playerId, position, card) {
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, cards: { ...p.cards, [position]: card } } : p
    ),
  };
}

// ── createInitialState ────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('creates correct number of players', () => {
    const s = makeState(['A', 'B', 'C']);
    expect(s.players).toHaveLength(3);
  });

  it('deals 4 cards to each player', () => {
    const s = makeState(['A', 'B']);
    for (const p of s.players) {
      expect(Object.values(p.cards).filter(Boolean)).toHaveLength(4);
    }
  });

  it('deck has 52 - (players * 4) cards after dealing', () => {
    const s = makeState(['A', 'B', 'C']);
    expect(s.deck).toHaveLength(52 - 12);
  });

  it('starts in INITIAL_REVEAL phase', () => {
    expect(makeState().phase).toBe(PHASES.INITIAL_REVEAL);
  });

  it('initialises cumulative scores at 0', () => {
    const s = makeState(['A', 'B']);
    for (const p of s.players) {
      expect(s.cumulativeScores[p.id]).toBe(0);
    }
  });

  it('all player cards are in POSITIONS', () => {
    const s = makeState();
    for (const p of s.players) {
      expect(Object.keys(p.cards).sort()).toEqual([...POSITIONS].sort());
    }
  });
});

// ── playerReady ───────────────────────────────────────────────────────────────

describe('playerReady', () => {
  it('marks a player ready', () => {
    const s = makeState();
    const s2 = playerReady(s, s.players[0].id);
    expect(s2.players[0].ready).toBe(true);
  });

  it('advances revealingPlayerIndex to next unready player', () => {
    const s = makeState(['A', 'B', 'C']);
    const s2 = playerReady(s, s.players[0].id);
    expect(s2.revealingPlayerIndex).toBe(1);
  });

  it('transitions to DRAW when all players ready', () => {
    const s = skipInitialReveal(makeState());
    expect(s.phase).toBe(PHASES.DRAW);
  });
});

// ── drawCard ──────────────────────────────────────────────────────────────────

describe('drawCard', () => {
  it('removes one card from deck', () => {
    let s = skipInitialReveal(makeState());
    const before = s.deck.length;
    s = drawCard(s);
    expect(s.deck.length).toBe(before - 1);
  });

  it('sets drawnCard', () => {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    expect(s.drawnCard).not.toBeNull();
  });

  it('transitions to ACTION phase', () => {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    expect(s.phase).toBe(PHASES.ACTION);
  });

  it('does not mutate original state', () => {
    const s = skipInitialReveal(makeState());
    const deckLenBefore = s.deck.length;
    drawCard(s);
    expect(s.deck.length).toBe(deckLenBefore);
  });
});

// ── actionSwap ────────────────────────────────────────────────────────────────

describe('actionSwap', () => {
  function drawReadyState() {
    let s = skipInitialReveal(makeState());
    return drawCard(s);
  }

  it('places drawn card into chosen position', () => {
    let s = drawReadyState();
    const drawn = s.drawnCard;
    s = actionSwap(s, 'TL');
    expect(s.players[0].cards.TL).toEqual(drawn);
  });

  it('moves replaced card to discard pile', () => {
    let s = drawReadyState();
    const replaced = s.players[0].cards.TL;
    s = actionSwap(s, 'TL');
    expect(s.discardPile[s.discardPile.length - 1]).toEqual(replaced);
  });

  it('clears drawnCard', () => {
    let s = drawReadyState();
    s = actionSwap(s, 'TL');
    expect(s.drawnCard).toBeNull();
  });

  it('transitions to MINE phase', () => {
    let s = drawReadyState();
    s = actionSwap(s, 'TL');
    expect(s.phase).toBe(PHASES.MINE);
  });

  it('ignores swap if slot is empty (eliminated)', () => {
    let s = drawReadyState();
    s = injectCard(s, s.players[0].id, 'TL', null);
    const before = s.players[0].cards.TL;
    const s2 = actionSwap(s, 'TL');
    expect(s2.players[0].cards.TL).toBeNull();
  });
});

// ── actionDiscard ─────────────────────────────────────────────────────────────

describe('actionDiscard', () => {
  it('moves drawn card to discard pile', () => {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    const drawn = s.drawnCard;
    s = actionDiscard(s);
    expect(s.discardPile[s.discardPile.length - 1]).toEqual(drawn);
  });

  it('transitions to MINE phase', () => {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    s = actionDiscard(s);
    expect(s.phase).toBe(PHASES.MINE);
  });
});

// ── actionUsePower ────────────────────────────────────────────────────────────

describe('actionUsePower', () => {
  function stateWithPowerCard(rank, suit = 'hearts') {
    const { getCardValue, getPowerType } = require('../shared/cards.js');
    return;
  }

  it('discards the power card', () => {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    if (s.drawnCard.power === POWER_TYPES.NONE) return; // non-power drawn, skip
    const powerCard = s.drawnCard;
    s = actionUsePower(s);
    expect(s.discardPile[s.discardPile.length - 1]).toEqual(powerCard);
  });

  it('sets powerPending', () => {
    let s = skipInitialReveal(makeState());
    // Force a power card into drawn
    s = { ...s, drawnCard: { id: 'hearts-6', suit: 'hearts', rank: '6', value: 6, power: POWER_TYPES.SELF_VIEW }, phase: PHASES.ACTION };
    s = actionUsePower(s);
    expect(s.powerPending).not.toBeNull();
    expect(s.powerPending.type).toBe(POWER_TYPES.SELF_VIEW);
  });

  it('returns same state for non-power card', () => {
    let s = skipInitialReveal(makeState());
    s = { ...s, drawnCard: { id: 'hearts-A', suit: 'hearts', rank: 'A', value: 1, power: POWER_TYPES.NONE }, phase: PHASES.ACTION };
    const s2 = actionUsePower(s);
    expect(s2).toBe(s);
  });
});

// ── callMine ──────────────────────────────────────────────────────────────────

describe('callMine', () => {
  function mineReadyState() {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    s = actionDiscard(s);
    return s; // now in MINE phase
  }

  it('sets mineWinner to the calling player', () => {
    let s = mineReadyState();
    const nonActive = s.players[1];
    s = callMine(s, nonActive.id);
    expect(s.mineWinner).toBe(nonActive.id);
  });

  it('transitions to MINE_ACTION', () => {
    let s = mineReadyState();
    s = callMine(s, s.players[1].id);
    expect(s.phase).toBe(PHASES.MINE_ACTION);
  });

  it('does not allow active player to call Mine', () => {
    let s = mineReadyState();
    const active = s.players[0];
    const s2 = callMine(s, active.id);
    expect(s2.mineWinner).toBeNull();
    expect(s2.phase).toBe(PHASES.MINE);
  });

  it('records caller in mineCalledBy', () => {
    let s = mineReadyState();
    s = callMine(s, s.players[1].id);
    expect(s.mineCalledBy).toContain(s.players[1].id);
  });

  it('does not allow a player to call Mine twice in the same chain', () => {
    let s = mineReadyState();
    // p1 calls Mine, does an exchange → new Mine window, p1 tries again
    s = callMine(s, s.players[1].id);
    s = mineExchange(s, 'TL');          // back to MINE phase, chain continues
    const s2 = callMine(s, s.players[1].id);
    expect(s2.mineWinner).toBeNull();   // blocked
    expect(s2.phase).toBe(PHASES.MINE);
  });

  it('resets mineCalledBy when chain ends via mineNoCall', () => {
    let s = mineReadyState();
    s = callMine(s, s.players[1].id);
    s = mineExchange(s, 'TL');
    s = mineNoCall(s);
    expect(s.mineCalledBy).toHaveLength(0);
  });
});

// ── mineNoCall ────────────────────────────────────────────────────────────────

describe('mineNoCall', () => {
  it('advances turn index', () => {
    let s = skipInitialReveal(makeState(['A', 'B', 'C']));
    s = drawCard(s);
    s = actionDiscard(s);
    const before = s.currentTurnIndex;
    s = mineNoCall(s);
    expect(s.currentTurnIndex).toBe((before + 1) % 3);
  });

  it('transitions to DRAW', () => {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    s = actionDiscard(s);
    s = mineNoCall(s);
    expect(s.phase).toBe(PHASES.DRAW);
  });

  it('clears mineChainMode', () => {
    let s = skipInitialReveal(makeState());
    s = { ...s, mineChainMode: 'exchange' };
    s = drawCard(s);
    s = actionDiscard(s);
    s = mineNoCall(s);
    expect(s.mineChainMode).toBeNull();
  });
});

// ── mineExchange ──────────────────────────────────────────────────────────────

describe('mineExchange', () => {
  function mineActionState() {
    let s = skipInitialReveal(makeState());
    s = drawCard(s);
    s = actionDiscard(s);
    s = callMine(s, s.players[1].id);
    return s;
  }

  it('swaps discard into mine winner hand', () => {
    let s = mineActionState();
    const discard = s.discardPile[s.discardPile.length - 1];
    const winner = s.players.find(p => p.id === s.mineWinner);
    s = mineExchange(s, 'TL');
    const updatedWinner = s.players.find(p => p.id === winner.id);
    expect(updatedWinner.cards.TL).toEqual(discard);
  });

  it('old card becomes new discard', () => {
    let s = mineActionState();
    const winner = s.players.find(p => p.id === s.mineWinner);
    const oldCard = winner.cards.TL;
    s = mineExchange(s, 'TL');
    expect(s.discardPile[s.discardPile.length - 1]).toEqual(oldCard);
  });

  it('sets mineChainMode to exchange', () => {
    let s = mineActionState();
    s = mineExchange(s, 'TL');
    expect(s.mineChainMode).toBe('exchange');
  });

  it('starts a new MINE phase', () => {
    let s = mineActionState();
    s = mineExchange(s, 'TL');
    expect(s.phase).toBe(PHASES.MINE);
  });

  it('does not allow exchange in elimination chain', () => {
    let s = mineActionState();
    s = { ...s, mineChainMode: 'elimination' };
    const s2 = mineExchange(s, 'TL');
    expect(s2).toBe(s);
  });
});

// ── mineSelfElim ──────────────────────────────────────────────────────────────

describe('mineSelfElim', () => {
  it('removes both cards on success', () => {
    let s = skipInitialReveal(makeState());
    // Set up a known discard and matching hand card
    const testCard = { id: 'hearts-5', suit: 'hearts', rank: '5', value: 5, power: POWER_TYPES.NONE };
    s = { ...s, discardPile: [testCard], phase: PHASES.MINE };
    s = callMine(s, s.players[1].id);
    s = injectCard(s, s.players[1].id, 'TL', { ...testCard, id: 'clubs-5' });
    s = mineSelfElim(s, 'TL');
    const winner = s.players.find(p => p.id !== s.players[0].id);
    // card was eliminated
    expect(winner ? s.players.find(p => p.id === winner.id)?.cards.TL : true).toBeNull();
    expect(s.phase).toBe(PHASES.MINE);
  });

  it('draws penalty into empty grid slot on failure', () => {
    let s = skipInitialReveal(makeState());
    const discardCard = { id: 'hearts-5', suit: 'hearts', rank: '5', value: 5, power: POWER_TYPES.NONE };
    const wrongCard   = { id: 'clubs-3',  suit: 'clubs',  rank: '3', value: 3, power: POWER_TYPES.NONE };
    s = { ...s, discardPile: [discardCard], phase: PHASES.MINE };
    s = callMine(s, s.players[1].id);
    s = injectCard(s, s.players[1].id, 'TL', wrongCard);
    s = injectCard(s, s.players[1].id, 'TR', null); // empty slot for penalty
    const before = s.deck.length;
    s = mineSelfElim(s, 'TL');
    expect(s.deck.length).toBe(before - 1);
    // penalty card fills the empty TR slot
    expect(s.players[1].cards.TR).not.toBeNull();
    expect(s.players[1].extraCards ?? []).toHaveLength(0);
  });

  it('penalty card overflows to extraCards when grid is full', () => {
    let s = skipInitialReveal(makeState());
    const discardCard = { id: 'hearts-5', suit: 'hearts', rank: '5', value: 5, power: POWER_TYPES.NONE };
    const wrongCard   = { id: 'clubs-3',  suit: 'clubs',  rank: '3', value: 3, power: POWER_TYPES.NONE };
    s = { ...s, discardPile: [discardCard], phase: PHASES.MINE };
    s = callMine(s, s.players[1].id);
    // All 4 grid slots are filled for the winner
    s = injectCard(s, s.players[1].id, 'TL', wrongCard);
    s = injectCard(s, s.players[1].id, 'TR', wrongCard);
    s = injectCard(s, s.players[1].id, 'BL', wrongCard);
    s = injectCard(s, s.players[1].id, 'BR', wrongCard);
    s = mineSelfElim(s, 'TL');
    // Penalty card must land in extraCards, not be lost
    expect(s.players[1].extraCards).toHaveLength(1);
  });

  it('extraCards count toward hand value', () => {
    const player = {
      id: 'p0', name: 'Test',
      cards: { TL: null, TR: null, BL: null, BR: null },
      extraCards: [
        { id: 'x1', suit: 'hearts', rank: '7', value: 7, power: POWER_TYPES.NONE },
        { id: 'x2', suit: 'clubs',  rank: '3', value: 3, power: POWER_TYPES.NONE },
      ],
    };
    expect(getHandValue(player)).toBe(10);
  });
});

// ── resolveCabo ───────────────────────────────────────────────────────────────

describe('resolveCabo', () => {
  it('successful cabo: caller gets 0 points', () => {
    let s = skipInitialReveal(makeState());
    // Force hand values: caller (p0) = 0, other (p1) = 5
    s = injectCard(s, s.players[0].id, 'TL', { id: 'h-K', suit: 'hearts', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'TR', { id: 'h-K2', suit: 'diamonds', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'BL', { id: 'h-K3', suit: 'clubs', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'BR', { id: 'h-K4', suit: 'spades', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = { ...s, caboCaller: s.players[0].id, phase: PHASES.CABO_RESOLUTION };
    s = resolveCabo(s);
    expect(s.roundScores[s.players[0].id]).toBe(0);
    expect(s.caboSuccess).toBe(true);
  });

  it('failed cabo: caller gets 50 penalty', () => {
    let s = skipInitialReveal(makeState());
    // Caller (p0) has high value, p1 has lower
    s = injectCard(s, s.players[0].id, 'TL', { id: 'h-Q', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'TR', { id: 'h-Q2', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'BL', { id: 'h-Q3', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'BR', { id: 'h-Q4', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    // p1 gets all Kings (0 each)
    s = injectCard(s, s.players[1].id, 'TL', { id: 'd-K', suit: 'diamonds', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[1].id, 'TR', { id: 'd-K2', suit: 'clubs', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[1].id, 'BL', { id: 'd-K3', suit: 'spades', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[1].id, 'BR', { id: 'd-K4', suit: 'diamonds', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = { ...s, caboCaller: s.players[0].id, phase: PHASES.CABO_RESOLUTION };
    s = resolveCabo(s);
    expect(s.roundScores[s.players[0].id]).toBe(FAILED_CABO_PENALTY);
    expect(s.roundScores[s.players[1].id]).toBe(0);
    expect(s.caboSuccess).toBe(false);
  });

  it('transitions to ROUND_OVER when no one exceeds 100 pts', () => {
    let s = skipInitialReveal(makeState());
    s = { ...s, caboCaller: s.players[0].id, phase: PHASES.CABO_RESOLUTION };
    s = resolveCabo(s);
    expect(s.phase).toBe(PHASES.ROUND_OVER);
  });

  it('transitions to GAME_OVER when cumulative reaches 100', () => {
    let s = skipInitialReveal(makeState());
    // Pre-load high cumulative score
    s = { ...s, cumulativeScores: { [s.players[0].id]: 90, [s.players[1].id]: 0 } };
    // Force caller to fail Cabo (adds 50 → 140 → >= 100)
    s = injectCard(s, s.players[0].id, 'TL', { id: 'h-Q', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'TR', { id: 'h-Q2', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'BL', { id: 'h-Q3', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[0].id, 'BR', { id: 'h-Q4', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[1].id, 'TL', { id: 'd-K', suit: 'diamonds', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[1].id, 'TR', { id: 'd-K2', suit: 'clubs', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[1].id, 'BL', { id: 'd-K3', suit: 'spades', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = injectCard(s, s.players[1].id, 'BR', { id: 'd-K4', suit: 'diamonds', rank: 'K', value: 0, power: POWER_TYPES.NONE });
    s = { ...s, caboCaller: s.players[0].id, phase: PHASES.CABO_RESOLUTION };
    s = resolveCabo(s);
    expect(s.phase).toBe(PHASES.GAME_OVER);
  });
});

// ── startNewRound ─────────────────────────────────────────────────────────────

describe('startNewRound', () => {
  it('increments round number', () => {
    let s = skipInitialReveal(makeState());
    s = { ...s, caboCaller: s.players[0].id };
    s = resolveCabo(s);
    const prev = s.roundNumber;
    s = startNewRound(s);
    expect(s.roundNumber).toBe(prev + 1);
  });

  it('deals fresh cards to all players', () => {
    let s = skipInitialReveal(makeState());
    s = startNewRound(s);
    for (const p of s.players) {
      expect(Object.values(p.cards).filter(Boolean)).toHaveLength(4);
    }
  });

  it('resets phase to INITIAL_REVEAL', () => {
    let s = skipInitialReveal(makeState());
    s = startNewRound(s);
    expect(s.phase).toBe(PHASES.INITIAL_REVEAL);
  });

  it('preserves cumulative scores', () => {
    let s = skipInitialReveal(makeState());
    const id = s.players[0].id;
    s = { ...s, cumulativeScores: { ...s.cumulativeScores, [id]: 15 } };
    s = startNewRound(s);
    expect(s.cumulativeScores[id]).toBe(15);
  });
});

// ── getHandValue ──────────────────────────────────────────────────────────────

describe('getHandValue', () => {
  it('sums all card values', () => {
    const player = {
      id: 'p0', name: 'Test',
      cards: {
        TL: { id: 'a', suit: 'hearts', rank: 'K', value: 0, power: POWER_TYPES.NONE },
        TR: { id: 'b', suit: 'hearts', rank: 'A', value: 1, power: POWER_TYPES.NONE },
        BL: { id: 'c', suit: 'hearts', rank: '5', value: 5, power: POWER_TYPES.NONE },
        BR: { id: 'd', suit: 'hearts', rank: 'Q', value: 12, power: POWER_TYPES.NONE },
      },
    };
    expect(getHandValue(player)).toBe(18);
  });

  it('ignores null slots (eliminated cards)', () => {
    const player = {
      id: 'p0', name: 'Test',
      cards: {
        TL: { id: 'a', suit: 'hearts', rank: 'K', value: 0, power: POWER_TYPES.NONE },
        TR: null,
        BL: { id: 'c', suit: 'hearts', rank: '5', value: 5, power: POWER_TYPES.NONE },
        BR: null,
      },
    };
    expect(getHandValue(player)).toBe(5);
  });
});

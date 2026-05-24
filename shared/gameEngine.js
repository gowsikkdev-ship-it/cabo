import { createDeck, shuffleDeck } from './cards.js';
import { POSITIONS, PHASES, POWER_TYPES, FAILED_CABO_PENALTY, MAX_SCORE } from './constants.js';

// ─── private helpers ─────────────────────────────────────────────────────────

function addLog(state, msg) {
  return { ...state, log: [...state.log, msg] };
}

function topDiscard(state) {
  const d = state.discardPile;
  return d.length > 0 ? d[d.length - 1] : null;
}

function nextTurnIndex(state) {
  return (state.currentTurnIndex + 1) % state.players.length;
}

function setCard(players, playerId, pos, card) {
  return players.map(p =>
    p.id === playerId ? { ...p, cards: { ...p.cards, [pos]: card } } : p
  );
}

function handValue(player) {
  const grid  = Object.values(player.cards).filter(Boolean).reduce((s, c) => s + c.value, 0);
  const extra = (player.extraCards ?? []).reduce((s, c) => s + c.value, 0);
  return grid + extra;
}

function reshuffleIfEmpty(state) {
  if (state.deck.length > 0) return state;
  if (state.discardPile.length <= 1) return state;
  const top = state.discardPile[state.discardPile.length - 1];
  const rest = state.discardPile.slice(0, -1);
  return addLog({ ...state, deck: shuffleDeck(rest), discardPile: [top] }, 'Deck reshuffled from discard pile');
}

function drawPenaltyCard(state, playerId) {
  let s = reshuffleIfEmpty(state);
  if (s.deck.length === 0) return s;
  const newDeck = [...s.deck];
  const card = newDeck.pop();
  const player = s.players.find(p => p.id === playerId);
  const emptyPos = POSITIONS.find(pos => player.cards[pos] === null);
  if (emptyPos) {
    // Fill the first empty slot in the 2×2 grid
    return { ...s, deck: newDeck, players: setCard(s.players, playerId, emptyPos, card) };
  }
  // Grid is full — card goes into overflow (counts toward score, shown separately)
  const newPlayers = s.players.map(p =>
    p.id === playerId ? { ...p, extraCards: [...(p.extraCards ?? []), card] } : p
  );
  return { ...s, deck: newDeck, players: newPlayers };
}

// ─── init ─────────────────────────────────────────────────────────────────────

export function createInitialState(playerNames) {
  let deck = shuffleDeck(createDeck());

  const players = playerNames.map((name, i) => ({
    id: `p${i}`,
    name,
    cards: { TL: null, TR: null, BL: null, BR: null },
    extraCards: [],
    ready: false,
  }));

  for (const player of players) {
    for (const pos of POSITIONS) {
      player.cards[pos] = deck.pop();
    }
  }

  const cumulativeScores = {};
  for (const p of players) cumulativeScores[p.id] = 0;

  return {
    players,
    deck,
    discardPile: [],
    currentTurnIndex: 0,
    revealingPlayerIndex: 0,
    phase: PHASES.INITIAL_REVEAL,
    drawnCard: null,
    powerPending: null,   // { type: POWER_TYPES.* }
    powerReveal: null,    // { viewerId, targetPlayerId, position, card }
    swapFirst: null,      // { playerId, position } — first pick for SWAP power
    mineWinner: null,     // playerId
    mineChainMode: null,  // null | 'exchange' | 'elimination'
    mineCalledBy: [],     // playerIds who called Mine in this chain — cannot call again
    caboCaller: null,
    handValues: null,
    roundScores: null,
    caboSuccess: null,
    cumulativeScores,
    roundNumber: 1,
    log: ['Game created'],
  };
}

// ─── initial reveal ───────────────────────────────────────────────────────────

export function playerReady(state, playerId) {
  const newPlayers = state.players.map(p =>
    p.id === playerId ? { ...p, ready: true } : p
  );
  const allReady = newPlayers.every(p => p.ready);
  const nextRevealIdx = newPlayers.findIndex(p => !p.ready);

  if (allReady) {
    return addLog({ ...state, players: newPlayers, phase: PHASES.DRAW }, 'All players ready — game begins!');
  }
  return addLog({
    ...state,
    players: newPlayers,
    revealingPlayerIndex: nextRevealIdx >= 0 ? nextRevealIdx : state.revealingPlayerIndex,
  }, `${state.players.find(p => p.id === playerId).name} is ready`);
}

// ─── cabo call (start of turn, before drawing) ────────────────────────────────

export function callCabo(state) {
  const player = state.players[state.currentTurnIndex];
  return addLog({ ...state, caboCaller: player.id, phase: PHASES.CABO_RESOLUTION }, `${player.name} calls Cabo!`);
}

// ─── draw phase ───────────────────────────────────────────────────────────────

export function drawCard(state) {
  let s = reshuffleIfEmpty(state);
  if (s.deck.length === 0) {
    return addLog({ ...s, phase: PHASES.MINE, currentTurnIndex: nextTurnIndex(s) }, 'Deck empty — turn skipped');
  }
  const newDeck = [...s.deck];
  const card = newDeck.pop();
  const player = s.players[s.currentTurnIndex];
  return addLog({ ...s, deck: newDeck, drawnCard: card, phase: PHASES.ACTION }, `${player.name} draws a card`);
}

// ─── action phase ─────────────────────────────────────────────────────────────

// Option A: swap drawn card with own card at position
export function actionSwap(state, position) {
  const player = state.players[state.currentTurnIndex];
  const replaced = player.cards[position];
  if (!replaced) return state; // empty slot

  const newPlayers = setCard(state.players, player.id, position, state.drawnCard);
  return addLog({
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, replaced],
    drawnCard: null,
    phase: PHASES.MINE,
  }, `${player.name} swaps ${position}, discards ${replaced.rank}`);
}

// Option B: use power ability of drawn card
export function actionUsePower(state) {
  const player = state.players[state.currentTurnIndex];
  const card = state.drawnCard;
  if (card.power === POWER_TYPES.NONE) return state;

  const phase = card.power === POWER_TYPES.SWAP ? PHASES.POWER_SELECT : PHASES.POWER_SELECT;
  return addLog({
    ...state,
    discardPile: [...state.discardPile, card],
    drawnCard: null,
    phase,
    powerPending: { type: card.power },
    swapFirst: null,
  }, `${player.name} uses ${card.power} power (${card.rank})`);
}

// Option C: discard drawn card without using power
export function actionDiscard(state) {
  const player = state.players[state.currentTurnIndex];
  const card = state.drawnCard;
  return addLog({
    ...state,
    discardPile: [...state.discardPile, card],
    drawnCard: null,
    phase: PHASES.MINE,
  }, `${player.name} discards ${card.rank}`);
}

// ─── power: select target card ────────────────────────────────────────────────

export function powerSelect(state, targetPlayerId, position) {
  const { type } = state.powerPending;
  const current = state.players[state.currentTurnIndex];

  if (type === POWER_TYPES.SELF_VIEW || type === POWER_TYPES.OPPONENT_VIEW) {
    const target = state.players.find(p => p.id === targetPlayerId);
    const card = target?.cards[position];
    if (!card) return state;
    return addLog({
      ...state,
      phase: PHASES.POWER_REVEAL,
      powerReveal: { viewerId: current.id, targetPlayerId, position, card },
      powerPending: null,
    }, `${current.name} privately views a card`);
  }

  if (type === POWER_TYPES.SWAP) {
    if (!state.swapFirst) {
      return { ...state, swapFirst: { playerId: targetPlayerId, position }, phase: PHASES.POWER_SWAP_SECOND };
    }
  }

  return state;
}

// Power: dismiss the private reveal and proceed to Mine phase
export function powerConfirmReveal(state) {
  return addLog({ ...state, powerReveal: null, phase: PHASES.MINE }, 'Card view dismissed — Mine phase');
}

// Power SWAP: select second card and execute swap
export function powerSwapSecond(state, targetPlayerId, position) {
  const { swapFirst } = state;
  const current = state.players[state.currentTurnIndex];
  if (swapFirst.playerId === targetPlayerId && swapFirst.position === position) {
    // Deselect first pick
    return { ...state, swapFirst: null, phase: PHASES.POWER_SELECT };
  }

  const p1 = state.players.find(p => p.id === swapFirst.playerId);
  const p2 = state.players.find(p => p.id === targetPlayerId);
  const card1 = p1?.cards[swapFirst.position];
  const card2 = p2?.cards[position];
  if (!card1 || !card2) return state;

  let newPlayers;
  if (swapFirst.playerId === targetPlayerId) {
    newPlayers = state.players.map(p =>
      p.id === swapFirst.playerId
        ? { ...p, cards: { ...p.cards, [swapFirst.position]: card2, [position]: card1 } }
        : p
    );
  } else {
    newPlayers = state.players.map(p => {
      if (p.id === swapFirst.playerId) return { ...p, cards: { ...p.cards, [swapFirst.position]: card2 } };
      if (p.id === targetPlayerId)     return { ...p, cards: { ...p.cards, [position]: card1 } };
      return p;
    });
  }

  return addLog({
    ...state,
    players: newPlayers,
    phase: PHASES.MINE,
    powerPending: null,
    swapFirst: null,
  }, `${current.name} swaps cards via power`);
}

// ─── mine phase ───────────────────────────────────────────────────────────────

export function callMine(state, playerId) {
  const current = state.players[state.currentTurnIndex];
  if (playerId === current.id) return state; // active player cannot call Mine
  if ((state.mineCalledBy ?? []).includes(playerId)) return state; // already used Mine this chain
  const caller = state.players.find(p => p.id === playerId);
  return addLog({
    ...state,
    mineWinner: playerId,
    mineCalledBy: [...(state.mineCalledBy ?? []), playerId],
    phase: PHASES.MINE_ACTION,
  }, `${caller.name} calls Mine!`);
}

export function mineNoCall(state) {
  return addLog({
    ...state,
    phase: PHASES.DRAW,
    currentTurnIndex: nextTurnIndex(state),
    mineChainMode: null,
    mineWinner: null,
    mineCalledBy: [],   // chain ends — reset for next Mine phase
    powerReveal: null,
  }, 'No Mine — turn ends');
}

// ─── mine actions ─────────────────────────────────────────────────────────────

// Exchange: swap top discard with one of mine winner's own cards
export function mineExchange(state, position) {
  if (state.mineChainMode === 'elimination') return state; // not allowed after elim in chain
  const winner = state.players.find(p => p.id === state.mineWinner);
  const discard = topDiscard(state);
  const ownCard = winner.cards[position];
  if (!ownCard || !discard) return state;

  const newPlayers = setCard(state.players, winner.id, position, discard);
  const newDiscard = [...state.discardPile.slice(0, -1), ownCard];
  return addLog({
    ...state,
    players: newPlayers,
    discardPile: newDiscard,
    mineWinner: null,
    mineChainMode: 'exchange',
    phase: PHASES.MINE,
  }, `${winner.name} exchanges with discard — new Mine phase`);
}

// Self Elimination: attempt to match own card with top discard
export function mineSelfElim(state, position) {
  const winner = state.players.find(p => p.id === state.mineWinner);
  const discard = topDiscard(state);
  const ownCard = winner.cards[position];
  if (!ownCard || !discard) return state;

  const success = ownCard.value === discard.value;
  if (success) {
    const newPlayers = setCard(state.players, winner.id, position, null);
    const newDiscard = state.discardPile.slice(0, -1);
    return addLog({
      ...state,
      players: newPlayers,
      discardPile: newDiscard,
      mineWinner: null,
      mineChainMode: 'elimination',
      phase: PHASES.MINE,
    }, `${winner.name} self-eliminates ${ownCard.rank}! SUCCESS`);
  }

  // Failure: draw penalty card
  let s = drawPenaltyCard(state, winner.id);
  return addLog({
    ...s,
    mineWinner: null,
    mineChainMode: 'elimination',
    phase: PHASES.MINE,
  }, `${winner.name} self-elim FAILED (own: ${ownCard.rank} vs discard: ${discard.rank}) — penalty drawn`);
}

// Opponent Elimination: guess target player's card matches top discard
export function mineOppElim(state, targetPlayerId, position) {
  const winner = state.players.find(p => p.id === state.mineWinner);
  const target = state.players.find(p => p.id === targetPlayerId);
  const discard = topDiscard(state);
  const targetCard = target?.cards[position];
  if (!targetCard || !discard || targetPlayerId === state.mineWinner) return state;

  const success = targetCard.value === discard.value;
  if (success) {
    const newPlayers = setCard(state.players, targetPlayerId, position, null);
    const newDiscard = state.discardPile.slice(0, -1);
    return addLog({
      ...state,
      players: newPlayers,
      discardPile: newDiscard,
      mineWinner: null,
      mineChainMode: 'elimination',
      phase: PHASES.MINE,
    }, `${winner.name} eliminates ${target.name}'s ${position} (${targetCard.rank})! SUCCESS`);
  }

  // Failure: winner draws penalty card; target card NOT publicly revealed
  let s = drawPenaltyCard(state, winner.id);
  return addLog({
    ...s,
    mineWinner: null,
    mineChainMode: 'elimination',
    phase: PHASES.MINE,
  }, `${winner.name} opp-elim FAILED — penalty drawn`);
}

// ─── cabo resolution ──────────────────────────────────────────────────────────

export function resolveCabo(state) {
  const caller = state.players.find(p => p.id === state.caboCaller);
  const vals = {};
  for (const p of state.players) vals[p.id] = handValue(p);

  const callerVal = vals[caller.id];
  const others = state.players.filter(p => p.id !== caller.id);
  const otherMin = others.length > 0 ? Math.min(...others.map(p => vals[p.id])) : Infinity;
  const success = callerVal <= otherMin;

  const roundScores = {};
  for (const p of state.players) {
    if (success) {
      roundScores[p.id] = p.id === caller.id ? 0 : vals[p.id];
    } else {
      if (p.id === caller.id) roundScores[p.id] = FAILED_CABO_PENALTY;
      else if (vals[p.id] === otherMin) roundScores[p.id] = 0;
      else roundScores[p.id] = vals[p.id];
    }
  }

  const cumulativeScores = { ...state.cumulativeScores };
  for (const p of state.players) {
    cumulativeScores[p.id] = (cumulativeScores[p.id] || 0) + roundScores[p.id];
  }

  const gameOver = Object.values(cumulativeScores).some(s => s >= MAX_SCORE);
  return addLog({
    ...state,
    handValues: vals,
    roundScores,
    cumulativeScores,
    caboSuccess: success,
    phase: gameOver ? PHASES.GAME_OVER : PHASES.ROUND_OVER,
  }, `Cabo resolved — ${caller.name} ${success ? 'WINS' : 'FAILS'}`);
}

// ─── new round ────────────────────────────────────────────────────────────────

export function startNewRound(state) {
  let deck = shuffleDeck(createDeck());
  const players = state.players.map(p => ({
    ...p,
    cards: { TL: null, TR: null, BL: null, BR: null },
    extraCards: [],
    ready: false,
  }));
  for (const player of players) {
    for (const pos of POSITIONS) {
      player.cards[pos] = deck.pop();
    }
  }
  return {
    ...state,
    players,
    deck,
    discardPile: [],
    currentTurnIndex: 0,
    revealingPlayerIndex: 0,
    phase: PHASES.INITIAL_REVEAL,
    drawnCard: null,
    powerPending: null,
    powerReveal: null,
    swapFirst: null,
    mineWinner: null,
    mineChainMode: null,
    mineCalledBy: [],
    caboCaller: null,
    handValues: null,
    roundScores: null,
    caboSuccess: null,
    roundNumber: state.roundNumber + 1,
    log: [`Round ${state.roundNumber + 1} begins`],
  };
}

// ─── selectors ────────────────────────────────────────────────────────────────

export function getActivePlayer(state) {
  return state.players[state.currentTurnIndex];
}

export function getTopDiscard(state) {
  return topDiscard(state);
}

export function getHandValue(player) {
  return handValue(player);
}

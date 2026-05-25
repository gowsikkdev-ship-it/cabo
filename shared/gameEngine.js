import { createDeck, shuffleDeck } from './cards.js';
import { POSITIONS, PHASES, POWER_TYPES, FAILED_CABO_PENALTY, MAX_SCORE } from './constants.js';

// ─── animation helper ─────────────────────────────────────────────────────────
// lastAction is consumed by the client FlyingCard overlay.
// Each move: { fromRef, toRef, card, faceUp }
// Refs: 'deck' | 'discard' | 'player-{id}' | 'slot-{id}-{pos}'
let _actionId = 0;
function action(moves) { return { id: ++_actionId, moves }; }

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
  // All cards are stored in player.cards (base positions + penalty positions P1/P2/...)
  return Object.values(player.cards).filter(Boolean).reduce((s, c) => s + c.value, 0);
}

// Returns all active position keys for a player (base + penalty overflow).
export function getPlayerPositions(player) {
  return Object.keys(player.cards).filter(k => player.cards[k] !== null);
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

  // First try to fill an empty base slot
  const emptyBase = POSITIONS.find(pos => player.cards[pos] === null);
  if (emptyBase) {
    return { ...s, deck: newDeck, players: setCard(s.players, playerId, emptyBase, card) };
  }

  // Grid full — add as penalty overflow with key P1, P2, ...
  const penaltyCount = Object.keys(player.cards).filter(k => k.startsWith('P')).length;
  const penaltyPos = `P${penaltyCount + 1}`;
  return { ...s, deck: newDeck, players: setCard(s.players, playerId, penaltyPos, card) };
}

// ─── init ─────────────────────────────────────────────────────────────────────

export function createInitialState(playerNames) {
  let deck = shuffleDeck(createDeck());

  const players = playerNames.map((name, i) => ({
    id: `p${i}`,
    name,
    cards: { TL: null, TR: null, BL: null, BR: null },
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
    powerPending: null,
    powerReveal: null,
    swapFirst: null,
    mineWinner: null,
    mineChainMode: null,
    // mineLastActedBy: playerId of whoever last performed an exchange/elimination in this
    // Mine chain. That player cannot call Mine again until someone else acts.
    mineLastActedBy: null,
    caboCaller: null,
    handValues: null,
    roundScores: null,
    caboSuccess: null,
    cumulativeScores,
    roundNumber: 1,
    lastMove: null,
    lastAction: null,
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
    return addLog({ ...s, phase: PHASES.MINE, currentTurnIndex: nextTurnIndex(s), lastAction: null }, 'Deck empty — turn skipped');
  }
  const newDeck = [...s.deck];
  const card = newDeck.pop();
  const player = s.players[s.currentTurnIndex];
  return addLog({
    ...s, deck: newDeck, drawnCard: card, phase: PHASES.ACTION,
    lastAction: action([{ fromRef: 'deck', toRef: 'drawn-card', card: null, faceUp: false }]),
  }, `${player.name} draws a card`);
}

// ─── action phase ─────────────────────────────────────────────────────────────

// Option A: swap drawn card with own card at position
export function actionSwap(state, position) {
  const player = state.players[state.currentTurnIndex];
  const replaced = player.cards[position];
  if (!replaced) return state;

  const newPlayers = setCard(state.players, player.id, position, state.drawnCard);
  return addLog({
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, replaced],
    drawnCard: null,
    phase: PHASES.MINE,
    lastMove: `${player.name} swapped their ${position} card (discarded ${replaced.rank})`,
    lastAction: action([
      { fromRef: 'drawn-card', toRef: `slot-${player.id}-${position}`, card: state.drawnCard, faceUp: false },
      { fromRef: `slot-${player.id}-${position}`, toRef: 'discard', card: replaced, faceUp: true },
    ]),
  }, `${player.name} swaps ${position}, discards ${replaced.rank}`);
}

// Option B: use power ability of drawn card
export function actionUsePower(state) {
  const player = state.players[state.currentTurnIndex];
  const card = state.drawnCard;
  if (card.power === POWER_TYPES.NONE) return state;

  return addLog({
    ...state,
    discardPile: [...state.discardPile, card],
    drawnCard: null,
    phase: PHASES.POWER_SELECT,
    powerPending: { type: card.power },
    swapFirst: null,
    lastMove: `${player.name} uses ${card.power} power (${card.rank})`,
    lastAction: action([{ fromRef: 'drawn-card', toRef: 'discard', card, faceUp: true }]),
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
    lastMove: `${player.name} discarded ${card.rank} (value ${card.value})`,
    lastAction: action([{ fromRef: 'drawn-card', toRef: 'discard', card, faceUp: true }]),
  }, `${player.name} discards ${card.rank}`);
}

// Option D: eliminate using drawn card against any player's face-down card (own or opponent).
// Success: target card removed, drawn card discarded. Failure: drawn card goes to active player's hand.
export function actionEliminate(state, targetPlayerId, position) {
  const player = state.players[state.currentTurnIndex]; // active player doing the action
  const target = state.players.find(p => p.id === targetPlayerId);
  const targetCard = target?.cards[position];
  const drawn = state.drawnCard;
  if (!targetCard || !drawn || targetCard.hidden) return state;

  const isSelf = targetPlayerId === player.id;
  const success = targetCard.value === drawn.value;

  if (success) {
    const newPlayers = setCard(state.players, targetPlayerId, position, null);
    const msg = isSelf
      ? `${player.name} eliminated their own ${position} card (${targetCard.rank}) using drawn ${drawn.rank}! SUCCESS`
      : `${player.name} eliminated ${target.name}'s ${position} card (${targetCard.rank})! SUCCESS`;
    return addLog({
      ...state,
      players: newPlayers,
      discardPile: [...state.discardPile, drawn],
      drawnCard: null,
      phase: PHASES.MINE,
      lastMove: msg,
    }, msg);
  }

  // Failure: drawn card goes to active player's hand as penalty
  const failMsg = isSelf
    ? `${player.name} eliminate FAILED (${targetCard.rank} vs drawn ${drawn.rank}) — drawn card to hand`
    : `${player.name} tried to eliminate ${target.name}'s ${position} — FAILED, drawn card to hand`;

  const emptyPos = POSITIONS.find(pos => player.cards[pos] === null);
  if (emptyPos) {
    const newPlayers = setCard(state.players, player.id, emptyPos, drawn);
    return addLog({ ...state, players: newPlayers, drawnCard: null, phase: PHASES.MINE, lastMove: failMsg }, failMsg);
  }
  const penaltyCount = Object.keys(player.cards).filter(k => k.startsWith('P')).length;
  const penaltyPos = `P${penaltyCount + 1}`;
  const newPlayers = setCard(state.players, player.id, penaltyPos, drawn);
  return addLog({ ...state, players: newPlayers, drawnCard: null, phase: PHASES.MINE, lastMove: failMsg }, failMsg);
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
    lastMove: `${current.name} swapped cards via power (${p1.name} ${swapFirst.position} ↔ ${p2.name} ${position})`,
    lastAction: action([
      { fromRef: `slot-${swapFirst.playerId}-${swapFirst.position}`, toRef: `slot-${targetPlayerId}-${position}`, card: null, faceUp: false },
      { fromRef: `slot-${targetPlayerId}-${position}`, toRef: `slot-${swapFirst.playerId}-${swapFirst.position}`, card: null, faceUp: false },
    ]),
  }, `${current.name} swaps cards via power`);
}

// ─── mine phase ───────────────────────────────────────────────────────────────

export function callMine(state, playerId) {
  const current = state.players[state.currentTurnIndex];
  if (playerId === current.id) return state; // active player cannot call Mine
  // Player who last performed an exchange/elimination cannot call Mine again until
  // at least one more exchange/elimination by a different player occurs.
  if (state.mineLastActedBy === playerId) return state;
  const caller = state.players.find(p => p.id === playerId);
  return addLog({
    ...state,
    mineWinner: playerId,
    mineCalledBy: [...(state.mineCalledBy ?? []), playerId], // kept for legacy compat
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
    mineLastActedBy: null,
    mineCalledBy: [],
    powerReveal: null,
    lastMove: null,
    lastAction: null,
  }, 'No Mine — turn ends');
}

// ─── mine actions ─────────────────────────────────────────────────────────────

// Exchange: swap top discard with one of mine winner's own cards
export function mineExchange(state, position) {
  if (state.mineChainMode === 'elimination') return state;
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
    mineLastActedBy: winner.id,
    phase: PHASES.MINE,
    lastMove: `${winner.name} exchanged their ${position} card (${ownCard.rank}) with discard (${discard.rank})`,
    lastAction: action([
      { fromRef: 'discard', toRef: `slot-${winner.id}-${position}`, card: discard, faceUp: false },
      { fromRef: `slot-${winner.id}-${position}`, toRef: 'discard', card: ownCard, faceUp: true },
    ]),
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
      mineLastActedBy: winner.id,
      phase: PHASES.MINE,
      lastMove: `${winner.name} eliminated their ${position} card (${ownCard.rank})! SUCCESS`,
    }, `${winner.name} self-eliminates ${ownCard.rank}! SUCCESS`);
  }

  let s = drawPenaltyCard(state, winner.id);
  return addLog({
    ...s,
    mineWinner: null,
    mineChainMode: 'elimination',
    mineLastActedBy: winner.id,
    phase: PHASES.MINE,
    lastMove: `${winner.name} self-elim FAILED (${ownCard.rank} vs discard ${discard.rank}) — penalty card drawn`,
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
      mineLastActedBy: winner.id,
      phase: PHASES.MINE,
      lastMove: `${winner.name} eliminated ${target.name}'s ${position} card! SUCCESS`,
    }, `${winner.name} eliminates ${target.name}'s ${position} (${targetCard.rank})! SUCCESS`);
  }

  let s = drawPenaltyCard(state, winner.id);
  return addLog({
    ...s,
    mineWinner: null,
    mineChainMode: 'elimination',
    mineLastActedBy: winner.id,
    phase: PHASES.MINE,
    lastMove: `${winner.name} tried to eliminate ${target.name}'s ${position} — FAILED, penalty drawn`,
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
    mineLastActedBy: null,
    mineCalledBy: [],
    caboCaller: null,
    handValues: null,
    roundScores: null,
    caboSuccess: null,
    lastMove: null,
    lastAction: null,
    roundNumber: state.roundNumber + 1,
    log: [`Round ${state.roundNumber + 1} begins`],
  };
}

export function forceEndGame(state) {
  return addLog({
    ...state,
    phase: PHASES.GAME_OVER,
    handValues: null,
    roundScores: null,
    caboSuccess: null,
    lastMove: 'Game ended early',
    lastAction: null,
  }, 'Game ended by player request');
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

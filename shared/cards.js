import { SUITS, RANKS, CARD_VALUES, POWER_TYPES } from './constants.js';

export function getCardValue(rank) {
  return CARD_VALUES[rank];
}

export function getPowerType(value) {
  if (value === 6 || value === 7) return POWER_TYPES.SELF_VIEW;
  if (value === 8 || value === 9) return POWER_TYPES.OPPONENT_VIEW;
  if (value === 10 || value === 11) return POWER_TYPES.SWAP;
  return POWER_TYPES.NONE;
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const value = getCardValue(rank);
      deck.push({ id: `${suit}-${rank}`, suit, rank, value, power: getPowerType(value) });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
export const SUIT_COLORS  = { hearts: '#e53e3e', diamonds: '#e53e3e', clubs: '#1a202c', spades: '#1a202c' };

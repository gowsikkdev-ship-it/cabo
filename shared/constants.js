export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const CARD_VALUES = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 0,
};

export const POWER_TYPES = {
  NONE: 'NONE',
  SELF_VIEW: 'SELF_VIEW',       // 6, 7
  OPPONENT_VIEW: 'OPPONENT_VIEW', // 8, 9
  SWAP: 'SWAP',                 // 10, 11 (J)
};

export const POSITIONS = ['TL', 'TR', 'BL', 'BR'];

export const POSITION_LABELS = {
  TL: 'Top Left',
  TR: 'Top Right',
  BL: 'Bottom Left',
  BR: 'Bottom Right',
};

export const PHASES = {
  INITIAL_REVEAL: 'INITIAL_REVEAL',
  DRAW: 'DRAW',
  ACTION: 'ACTION',
  POWER_SELECT: 'POWER_SELECT',
  POWER_REVEAL: 'POWER_REVEAL',
  POWER_SWAP_SECOND: 'POWER_SWAP_SECOND',
  MINE: 'MINE',
  MINE_ACTION: 'MINE_ACTION',
  CABO_RESOLUTION: 'CABO_RESOLUTION',
  ROUND_OVER: 'ROUND_OVER',
  GAME_OVER: 'GAME_OVER',
};

export const MINE_WINDOW_MS = 2000;
export const FAILED_CABO_PENALTY = 50;
export const MAX_SCORE = 100;
export const CARDS_PER_PLAYER = 4;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

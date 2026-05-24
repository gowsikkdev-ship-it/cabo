// Socket event names shared between client and server (Phase 5+)
export const EVENTS = {
  // ── Client → Server ──────────────────────────────────────────────────────────
  CREATE_ROOM:      'create_room',
  JOIN_ROOM:        'join_room',
  LEAVE_ROOM:       'leave_room',
  RECONNECT:        'reconnect',
  PLAYER_READY:     'player_ready',
  START_GAME:       'start_game',

  CALL_CABO:        'call_cabo',
  DRAW_CARD:        'draw_card',
  ACTION_SWAP:      'action_swap',
  ACTION_USE_POWER: 'action_use_power',
  ACTION_DISCARD:   'action_discard',
  ACTION_ELIMINATE: 'action_eliminate',
  POWER_SELECT:         'power_select',
  POWER_SWAP_SECOND:    'power_swap_second',
  POWER_CONFIRM_REVEAL: 'power_confirm_reveal',

  // Mine reactions (Phase 6 — realtime)
  CALL_MINE:        'call_mine',
  MINE_NO_CALL:     'mine_no_call',
  MINE_EXCHANGE:    'mine_exchange',
  MINE_SELF_ELIM:   'mine_self_elim',
  MINE_OPP_ELIM:    'mine_opp_elim',

  RESOLVE_CABO:     'resolve_cabo',
  START_NEW_ROUND:  'start_new_round',

  // Latency probe (Phase 7)
  CLIENT_PONG:      'client_pong',

  // ── Server → Client ──────────────────────────────────────────────────────────
  ROOM_CREATED:       'room_created',
  ROOM_JOINED:        'room_joined',
  PLAYER_LIST:        'player_list',
  GAME_STARTED:       'game_started',

  GAME_STATE_UPDATE:  'game_state_update',
  PRIVATE_REVEAL:     'private_reveal',

  // Mine window lifecycle (Phase 6)
  MINE_WINDOW_OPEN:   'mine_window_open',
  MINE_WINDOW_CLOSE:  'mine_window_close',
  MINE_RESULT:        'mine_result',
  ELIM_RESULT:        'elim_result',

  ROUND_END:          'round_end',
  GAME_END:           'game_end',

  // Latency probe (Phase 7)
  SERVER_PING:        'server_ping',

  ERROR:              'error',
  KICKED:             'kicked',
};

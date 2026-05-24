/**
 * State sanitization (Phase 9 — anti-cheat).
 *
 * The full game state contains all card values. This module strips card values
 * for cards belonging to OTHER players that haven't been legitimately revealed
 * to `myPlayerId`.  It also removes the deck array (replaced with deck count).
 *
 * Revealed cards are tracked in `state.revealed`, a Map (or plain object)
 * keyed as `"playerId:position"` → true. The server populates this when a
 * SELF_VIEW / OPPONENT_VIEW power is used, and clears entries when cards move.
 */

const HIDDEN = { hidden: true };

export function sanitizeForPlayer(fullState, myPlayerId) {
  if (!fullState) return null;

  const revealed = fullState.revealed ?? {};

  const players = fullState.players.map(player => {
    const isMine = player.id === myPlayerId;

    const cards = {};
    for (const [pos, card] of Object.entries(player.cards)) {
      if (card === null) {
        cards[pos] = null;
      } else if (isMine) {
        cards[pos] = card; // own cards always visible
      } else {
        const key = `${player.id}:${pos}`;
        cards[pos] = revealed[key] ? card : HIDDEN;
      }
    }

    const extraCards = (player.extraCards ?? []).map(card => {
      if (isMine) return card;
      return HIDDEN;
    });

    return { ...player, cards, extraCards };
  });

  return {
    ...fullState,
    players,
    // Replace deck array with count only — never expose deck order
    deck: undefined,
    deckCount: fullState.deck?.length ?? 0,
    // Remove internal-only fields
    revealed: undefined,
  };
}

/**
 * Mark a card as revealed to a specific player.
 * Returns a new `revealed` object (pure).
 */
export function reveal(revealed, viewerId, targetPlayerId, position) {
  const key = `${targetPlayerId}:${position}`;
  return { ...revealed, [key]: viewerId };
}

/**
 * Clear all reveal entries for a card that has moved/changed.
 */
export function clearReveal(revealed, targetPlayerId, position) {
  const key = `${targetPlayerId}:${position}`;
  const next = { ...revealed };
  delete next[key];
  return next;
}

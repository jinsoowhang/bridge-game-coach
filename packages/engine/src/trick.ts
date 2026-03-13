import type { Card, Position, Trick, BidSuit, Suit } from './types.js';
import { POSITIONS } from './types.js';
import { RANK_ORDER } from './card.js';

/**
 * Get the list of valid plays from a hand given the current trick state.
 * - If leading (no cards in trick yet): any card is valid.
 * - If following: must follow the led suit if possible, otherwise any card.
 */
export function getValidPlays(
  hand: Card[],
  currentTrick: Trick | null,
  _trumpSuit: BidSuit,
): Card[] {
  if (!currentTrick || currentTrick.cards.size === 0) {
    return [...hand];
  }

  // Determine led suit from the leader's card
  const ledCard = currentTrick.cards.get(currentTrick.leader);
  if (!ledCard) return [...hand];

  const ledSuit = ledCard.suit;
  const followingCards = hand.filter(c => c.suit === ledSuit);

  if (followingCards.length > 0) {
    return followingCards;
  }

  // Can't follow suit — any card is valid
  return [...hand];
}

/**
 * Determine the winner of a completed trick.
 */
export function determineTrickWinner(
  trick: Trick,
  trumpSuit: BidSuit,
): Position {
  const ledCard = trick.cards.get(trick.leader)!;
  const ledSuit = ledCard.suit;

  // Build list of (position, card) in play order
  const plays: Array<{ position: Position; card: Card }> = [];
  const leaderIdx = POSITIONS.indexOf(trick.leader);
  for (let i = 0; i < 4; i++) {
    const pos = POSITIONS[(leaderIdx + i) % 4];
    const card = trick.cards.get(pos);
    if (card) {
      plays.push({ position: pos, card });
    }
  }

  // In notrump, highest of led suit wins
  if (trumpSuit === 'notrump') {
    let winner = plays[0];
    for (let i = 1; i < plays.length; i++) {
      const p = plays[i];
      if (p.card.suit === ledSuit && RANK_ORDER[p.card.rank] > RANK_ORDER[winner.card.rank]) {
        winner = p;
      } else if (winner.card.suit !== ledSuit) {
        // winner was not following led suit (shouldn't happen normally, but handle it)
        if (p.card.suit === ledSuit) winner = p;
      }
    }
    return winner.position;
  }

  // Suited contract: trump beats non-trump, highest trump wins, otherwise highest of led suit
  const trumpPlays = plays.filter(p => p.card.suit === (trumpSuit as Suit));

  if (trumpPlays.length > 0) {
    let winner = trumpPlays[0];
    for (let i = 1; i < trumpPlays.length; i++) {
      if (RANK_ORDER[trumpPlays[i].card.rank] > RANK_ORDER[winner.card.rank]) {
        winner = trumpPlays[i];
      }
    }
    return winner.position;
  }

  // No trumps played — highest of led suit wins
  const ledSuitPlays = plays.filter(p => p.card.suit === ledSuit);
  let winner = ledSuitPlays[0];
  for (let i = 1; i < ledSuitPlays.length; i++) {
    if (RANK_ORDER[ledSuitPlays[i].card.rank] > RANK_ORDER[winner.card.rank]) {
      winner = ledSuitPlays[i];
    }
  }
  return winner.position;
}

/**
 * Create an empty trick with the given leader.
 */
export function createTrick(leader: Position): Trick {
  return {
    cards: new Map(),
    leader,
  };
}

/**
 * Add a card to a trick, returning a new Trick (immutable).
 */
export function addCardToTrick(
  trick: Trick,
  position: Position,
  card: Card,
): Trick {
  const newCards = new Map(trick.cards);
  newCards.set(position, card);
  return {
    ...trick,
    cards: newCards,
  };
}

/**
 * A trick is complete when 4 cards have been played.
 */
export function isTrickComplete(trick: Trick): boolean {
  return trick.cards.size === 4;
}

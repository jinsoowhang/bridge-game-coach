/**
 * Defensive play engine — opening leads and defensive card selection.
 */
import type { Card, Position, Contract, BridgeState, Suit } from '../types.js';
import { RANK_ORDER } from '../card.js';
import { selectPlay } from './play-engine.js';

// ===== Helpers =====

function cardsInSuit(cards: Card[], suit: Suit): Card[] {
  return cards.filter(c => c.suit === suit);
}

function sortByRankDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
}

function sortByRankAsc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
}

function suitLengths(hand: Card[]): Record<Suit, number> {
  const counts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  for (const card of hand) {
    counts[card.suit]++;
  }
  return counts;
}

/** Check if cards form a top-of-sequence (e.g., K-Q-J). Returns the top card or null. */
function topOfSequence(cards: Card[]): Card | null {
  const sorted = sortByRankDesc(cards);
  if (sorted.length < 2) return null;
  if (RANK_ORDER[sorted[0].rank] - RANK_ORDER[sorted[1].rank] === 1) {
    return sorted[0];
  }
  return null;
}

/** Find singleton suits. */
function findSingletons(hand: Card[]): Card[] {
  const lengths = suitLengths(hand);
  return hand.filter(c => lengths[c.suit] === 1);
}

// ===== Opening Lead Selection =====

/**
 * Select the opening lead against a contract.
 * - Against NT: 4th from longest and strongest suit
 * - Against suit: top of sequence, or singleton, or 4th best
 */
export function selectOpeningLead(hand: Card[], contract: Contract): Card {
  const trumpSuit = contract.suit === 'notrump' ? null : contract.suit as Suit;
  const isNT = contract.suit === 'notrump';

  if (isNT) {
    return selectNTLead(hand);
  } else {
    return selectSuitLead(hand, trumpSuit!);
  }
}

/** Lead against notrump: 4th from longest and strongest. */
function selectNTLead(hand: Card[]): Card {
  const lengths = suitLengths(hand);

  // Find longest suit(s)
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const maxLen = Math.max(...suits.map(s => lengths[s]));
  const longestSuits = suits.filter(s => lengths[s] === maxLen);

  // Among longest, pick strongest (most HCP in suit)
  let bestSuit = longestSuits[0];
  let bestStrength = -1;
  for (const suit of longestSuits) {
    const cards = cardsInSuit(hand, suit);
    const strength = cards.reduce((sum, c) => {
      if (c.rank === 'A') return sum + 4;
      if (c.rank === 'K') return sum + 3;
      if (c.rank === 'Q') return sum + 2;
      if (c.rank === 'J') return sum + 1;
      return sum;
    }, 0);
    if (strength > bestStrength) {
      bestStrength = strength;
      bestSuit = suit;
    }
  }

  const suitCards = sortByRankDesc(cardsInSuit(hand, bestSuit));

  // 4th best from the suit
  if (suitCards.length >= 4) {
    return suitCards[3];
  }

  // If fewer than 4 cards, lead low
  return suitCards[suitCards.length - 1];
}

/** Lead against a suit contract. */
function selectSuitLead(hand: Card[], trumpSuit: Suit): Card {
  const nonTrump = hand.filter(c => c.suit !== trumpSuit);
  const lengths = suitLengths(hand);

  // 1. Top of sequence in a non-trump suit
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  for (const suit of suits) {
    if (suit === trumpSuit) continue;
    const cards = cardsInSuit(hand, suit);
    const top = topOfSequence(cards);
    if (top) return top;
  }

  // 2. Singleton in a non-trump suit
  const singletons = findSingletons(nonTrump);
  if (singletons.length > 0) {
    return singletons[0];
  }

  // 3. 4th best from longest non-trump suit
  const nonTrumpSuits = suits
    .filter(s => s !== trumpSuit && lengths[s] > 0)
    .sort((a, b) => lengths[b] - lengths[a]);

  if (nonTrumpSuits.length > 0) {
    const suitCards = sortByRankDesc(cardsInSuit(hand, nonTrumpSuits[0]));
    if (suitCards.length >= 4) {
      return suitCards[3];
    }
    return suitCards[suitCards.length - 1];
  }

  // 4. Fallback: lead lowest trump
  const trumpCards = sortByRankAsc(cardsInSuit(hand, trumpSuit));
  return trumpCards[0] ?? hand[0];
}

// ===== Defensive Play =====

/**
 * Select a defensive play. For v1, delegates to the play-engine heuristics.
 */
export function selectDefensivePlay(
  position: Position,
  hand: Card[],
  validCards: Card[],
  state: BridgeState,
): Card {
  return selectPlay(position, hand, validCards, state);
}

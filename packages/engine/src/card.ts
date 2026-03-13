import type { Card, Suit, Rank } from './types.js';

// ===== Constants =====

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '\u2663',
  diamonds: '\u2666',
  hearts: '\u2665',
  spades: '\u2660',
};

/** Ascending order for bidding (clubs lowest). */
export const SUIT_ORDER: Record<Suit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
};

/** Ascending order: 2 = 0 ... A = 12. */
export const RANK_ORDER: Record<Rank, number> = {
  '2': 0,
  '3': 1,
  '4': 2,
  '5': 3,
  '6': 4,
  '7': 5,
  '8': 6,
  '9': 7,
  '10': 8,
  J: 9,
  Q: 10,
  K: 11,
  A: 12,
};

// ===== Factory =====

export function createCard(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

// ===== Comparison =====

/**
 * Sort comparator for display: spades, hearts, diamonds, clubs (descending suit),
 * then descending rank within each suit (A high).
 */
export function compareBySuit(a: Card, b: Card): number {
  const suitDiff = SUIT_ORDER[b.suit] - SUIT_ORDER[a.suit];
  if (suitDiff !== 0) return suitDiff;
  return RANK_ORDER[b.rank] - RANK_ORDER[a.rank];
}

/** Compare by rank only (ascending). */
export function compareByRank(a: Card, b: Card): number {
  return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
}

/** True if two cards have the same suit and rank. */
export function cardEquals(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

// ===== Display =====

/** e.g. "A♠", "10♥" */
export function cardToString(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

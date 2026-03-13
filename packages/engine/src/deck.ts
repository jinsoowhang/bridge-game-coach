import type { Card, Position } from './types.js';
import { SUITS, RANKS, POSITIONS } from './types.js';
import { createCard, compareBySuit } from './card.js';

/**
 * Create a standard 52-card deck (unshuffled).
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(suit, rank));
    }
  }
  return deck;
}

/**
 * Return a shuffled copy using Fisher-Yates.
 */
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal 13 cards to each position (North, East, South, West).
 * Each hand is sorted for display (spades first, descending rank).
 */
export function dealHands(deck: Card[]): Record<Position, Card[]> {
  if (deck.length < 52) {
    throw new Error(`Need 52 cards to deal, got ${deck.length}`);
  }

  const hands = {} as Record<Position, Card[]>;
  for (let i = 0; i < POSITIONS.length; i++) {
    hands[POSITIONS[i]] = deck.slice(i * 13, (i + 1) * 13).sort(compareBySuit);
  }
  return hands;
}

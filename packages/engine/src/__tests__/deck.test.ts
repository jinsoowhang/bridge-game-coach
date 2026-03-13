import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealHands } from '../deck.js';
import { cardEquals } from '../card.js';
import { POSITIONS } from '../types.js';

describe('createDeck', () => {
  it('produces exactly 52 cards', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('has no duplicates', () => {
    const deck = createDeck();
    const keys = deck.map(c => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('contains all four suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(c => c.suit));
    expect(suits).toEqual(new Set(['clubs', 'diamonds', 'hearts', 'spades']));
  });

  it('contains all 13 ranks per suit', () => {
    const deck = createDeck();
    const spades = deck.filter(c => c.suit === 'spades');
    expect(spades).toHaveLength(13);
  });
});

describe('shuffleDeck', () => {
  it('returns a new array (does not mutate input)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).not.toBe(deck);
    expect(shuffled).toHaveLength(52);
  });

  it('contains the same cards as the original', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const originalKeys = new Set(deck.map(c => `${c.suit}-${c.rank}`));
    const shuffledKeys = new Set(shuffled.map(c => `${c.suit}-${c.rank}`));
    expect(shuffledKeys).toEqual(originalKeys);
  });

  it('produces a different order (probabilistic — re-run if flaky)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    // Extremely unlikely for a shuffled deck to remain identical
    const sameOrder = deck.every((c, i) => cardEquals(c, shuffled[i]));
    expect(sameOrder).toBe(false);
  });
});

describe('dealHands', () => {
  it('gives 13 cards to each of the 4 positions', () => {
    const hands = dealHands(shuffleDeck(createDeck()));
    for (const pos of POSITIONS) {
      expect(hands[pos]).toHaveLength(13);
    }
  });

  it('has no duplicates across all hands', () => {
    const hands = dealHands(shuffleDeck(createDeck()));
    const allCards = POSITIONS.flatMap(p => hands[p]);
    const keys = allCards.map(c => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('sorts each hand by suit (spades first) then rank descending', () => {
    const hands = dealHands(shuffleDeck(createDeck()));
    for (const pos of POSITIONS) {
      const hand = hands[pos];
      for (let i = 1; i < hand.length; i++) {
        const prev = hand[i - 1];
        const curr = hand[i];
        // Suit order: spades (3) >= hearts (2) >= diamonds (1) >= clubs (0)
        const prevSuitVal = suitValue(prev.suit);
        const currSuitVal = suitValue(curr.suit);
        if (prevSuitVal === currSuitVal) {
          // Within same suit, rank should be descending
          expect(rankValue(prev.rank)).toBeGreaterThanOrEqual(rankValue(curr.rank));
        } else {
          expect(prevSuitVal).toBeGreaterThan(currSuitVal);
        }
      }
    }
  });

  it('throws if deck has fewer than 52 cards', () => {
    expect(() => dealHands([])).toThrow();
  });
});

// Helpers matching the card module's ordering
function suitValue(s: string): number {
  return { clubs: 0, diamonds: 1, hearts: 2, spades: 3 }[s] ?? -1;
}
function rankValue(r: string): number {
  return { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8, J: 9, Q: 10, K: 11, A: 12 }[r] ?? -1;
}

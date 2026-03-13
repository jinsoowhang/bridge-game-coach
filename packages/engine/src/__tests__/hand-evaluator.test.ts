import { describe, it, expect } from 'vitest';
import { createCard } from '../card.js';
import type { Card } from '../types.js';
import {
  countHCP,
  countDistributionPoints,
  getShape,
  isBalanced,
  analyzeHand,
} from '../hand-evaluator.js';

// Helper to build a hand quickly
function hand(...specs: Array<[string, string]>): Card[] {
  return specs.map(([suit, rank]) => createCard(suit as any, rank as any));
}

describe('countHCP', () => {
  it('counts 0 for a hand with no honors', () => {
    const h = hand(
      ['spades', '2'], ['spades', '3'], ['spades', '4'],
      ['hearts', '5'], ['hearts', '6'], ['hearts', '7'],
      ['diamonds', '8'], ['diamonds', '9'], ['diamonds', '10'],
      ['clubs', '2'], ['clubs', '3'], ['clubs', '4'], ['clubs', '5'],
    );
    expect(countHCP(h)).toBe(0);
  });

  it('counts 10 for A=4 + K=3 + Q=2 + J=1', () => {
    const h = hand(
      ['spades', 'A'], ['hearts', 'K'], ['diamonds', 'Q'], ['clubs', 'J'],
      ['spades', '2'], ['spades', '3'], ['spades', '4'],
      ['hearts', '5'], ['hearts', '6'],
      ['diamonds', '7'], ['diamonds', '8'],
      ['clubs', '9'], ['clubs', '10'],
    );
    expect(countHCP(h)).toBe(10);
  });

  it('counts 37 max for 4 aces + 4 kings + 4 queens + 1 jack', () => {
    const h = hand(
      ['spades', 'A'], ['hearts', 'A'], ['diamonds', 'A'], ['clubs', 'A'],
      ['spades', 'K'], ['hearts', 'K'], ['diamonds', 'K'], ['clubs', 'K'],
      ['spades', 'Q'], ['hearts', 'Q'], ['diamonds', 'Q'], ['clubs', 'Q'],
      ['spades', 'J'],
    );
    expect(countHCP(h)).toBe(37);
  });
});

describe('countDistributionPoints', () => {
  it('returns 0 for a balanced 4-3-3-3 hand', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'],
      ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    expect(countDistributionPoints(h)).toBe(0);
  });

  it('returns 3 for a void', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['spades', '10'], ['spades', '9'], ['spades', '8'],
      ['hearts', '2'], ['hearts', '3'],
      ['diamonds', '4'], ['diamonds', '5'], ['diamonds', '6'],
      // no clubs = void
      ['diamonds', '7'],
    );
    expect(countDistributionPoints(h)).toBe(4); // void(3) + doubleton(1)
  });

  it('returns 2 for a singleton', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'],
      ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['diamonds', '8'], ['diamonds', '9'],
      ['clubs', '10'], // singleton
    );
    expect(countDistributionPoints(h)).toBe(2);
  });

  it('returns 1 for a doubleton', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'],
      ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['diamonds', '8'],
      ['clubs', '9'], ['clubs', '10'], // doubleton
    );
    expect(countDistributionPoints(h)).toBe(1);
  });
});

describe('getShape', () => {
  it('returns [4,3,3,3] for a 4-3-3-3 hand', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'],
      ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    expect(getShape(h)).toEqual([4, 3, 3, 3]);
  });

  it('returns correct shape for an unbalanced hand', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['spades', '10'], ['spades', '9'], ['spades', '8'],
      ['hearts', '2'], ['hearts', '3'],
      ['diamonds', '4'], ['diamonds', '5'], ['diamonds', '6'],
      ['clubs', '7'],
    );
    expect(getShape(h)).toEqual([7, 2, 3, 1]);
  });
});

describe('isBalanced', () => {
  it('4-3-3-3 is balanced', () => {
    expect(isBalanced([4, 3, 3, 3])).toBe(true);
  });

  it('4-4-3-2 is balanced', () => {
    expect(isBalanced([4, 4, 3, 2])).toBe(true);
    expect(isBalanced([2, 4, 3, 4])).toBe(true); // different order
  });

  it('5-3-3-2 is balanced', () => {
    expect(isBalanced([5, 3, 3, 2])).toBe(true);
    expect(isBalanced([3, 2, 5, 3])).toBe(true);
  });

  it('5-4-3-1 is not balanced', () => {
    expect(isBalanced([5, 4, 3, 1])).toBe(false);
  });

  it('6-3-2-2 is not balanced', () => {
    expect(isBalanced([6, 3, 2, 2])).toBe(false);
  });

  it('7-2-3-1 is not balanced', () => {
    expect(isBalanced([7, 2, 3, 1])).toBe(false);
  });
});

describe('analyzeHand', () => {
  it('returns a full analysis object', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'],
      ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    const analysis = analyzeHand(h);
    expect(analysis.hcp).toBe(10);
    expect(analysis.distributionPoints).toBe(0);
    expect(analysis.totalPoints).toBe(10);
    expect(analysis.shape).toEqual([4, 3, 3, 3]);
    expect(analysis.isBalanced).toBe(true);
    expect(analysis.longestSuit).toBe('spades');
    expect(analysis.longestLength).toBe(4);
  });

  it('identifies the longest suit correctly', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'], ['hearts', '5'], ['hearts', '6'],
      ['diamonds', '7'], ['diamonds', '8'], ['diamonds', '9'],
      ['clubs', '10'], ['clubs', 'J'], ['clubs', 'Q'],
    );
    const analysis = analyzeHand(h);
    expect(analysis.longestSuit).toBe('hearts');
    expect(analysis.longestLength).toBe(5);
  });
});

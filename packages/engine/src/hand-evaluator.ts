import type { Card, Suit, HandAnalysis } from './types.js';
import { SUITS } from './types.js';

const HCP_VALUES: Record<string, number> = {
  A: 4,
  K: 3,
  Q: 2,
  J: 1,
};

/**
 * Count high-card points: A=4, K=3, Q=2, J=1.
 */
export function countHCP(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + (HCP_VALUES[card.rank] ?? 0), 0);
}

/**
 * Count distribution points: void=3, singleton=2, doubleton=1.
 */
export function countDistributionPoints(hand: Card[]): number {
  let points = 0;
  for (const suit of SUITS) {
    const count = hand.filter(c => c.suit === suit).length;
    if (count === 0) points += 3;
    else if (count === 1) points += 2;
    else if (count === 2) points += 1;
  }
  return points;
}

/**
 * Return suit lengths as [spades, hearts, diamonds, clubs].
 */
export function getShape(hand: Card[]): [number, number, number, number] {
  const spades = hand.filter(c => c.suit === 'spades').length;
  const hearts = hand.filter(c => c.suit === 'hearts').length;
  const diamonds = hand.filter(c => c.suit === 'diamonds').length;
  const clubs = hand.filter(c => c.suit === 'clubs').length;
  return [spades, hearts, diamonds, clubs];
}

/**
 * A hand is balanced if its shape (sorted descending) is
 * 4-3-3-3, 4-4-3-2, or 5-3-3-2.
 */
export function isBalanced(shape: [number, number, number, number]): boolean {
  const sorted = [...shape].sort((a, b) => b - a);
  const key = sorted.join('-');
  return key === '4-3-3-3' || key === '4-4-3-2' || key === '5-3-3-2';
}

/**
 * Full hand analysis.
 */
export function analyzeHand(hand: Card[]): HandAnalysis {
  const hcp = countHCP(hand);
  const distributionPoints = countDistributionPoints(hand);
  const shape = getShape(hand);
  const balanced = isBalanced(shape);

  // Find longest suit — order: spades, hearts, diamonds, clubs
  const suitOrder: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  let longestSuit: Suit = 'spades';
  let longestLength = shape[0];
  for (let i = 1; i < 4; i++) {
    if (shape[i] > longestLength) {
      longestLength = shape[i];
      longestSuit = suitOrder[i];
    }
  }

  return {
    hcp,
    distributionPoints,
    totalPoints: hcp + distributionPoints,
    shape,
    isBalanced: balanced,
    longestSuit,
    longestLength,
  };
}

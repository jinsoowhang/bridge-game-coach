import { describe, it, expect } from 'vitest';
import { createCard } from '../card.js';
import type { Card, ContractBid } from '../types.js';
import { analyzeHand } from '../hand-evaluator.js';
import { isContractBid } from '../auction.js';
import {
  selectOpeningBid,
  selectResponseTo1Suit,
  selectResponseTo1NT,
  fiveCardMajor,
  longestMinor,
} from '../ai/bidding-rules.js';

function hand(...specs: Array<[string, string]>): Card[] {
  return specs.map(([suit, rank]) => createCard(suit as any, rank as any));
}

describe('bidding-rules helpers', () => {
  it('fiveCardMajor finds 5-card spades', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'], ['spades', '10'],
      ['hearts', '2'], ['hearts', '3'],
      ['diamonds', '4'], ['diamonds', '5'], ['diamonds', '6'],
      ['clubs', '7'], ['clubs', '8'], ['clubs', '9'],
    );
    const a = analyzeHand(h);
    expect(fiveCardMajor(a)).toBe('spades');
  });

  it('fiveCardMajor returns null with no 5-card major', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'],
      ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    const a = analyzeHand(h);
    expect(fiveCardMajor(a)).toBeNull();
  });

  it('longestMinor prefers diamonds when 4-4', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'],
      ['hearts', '2'], ['hearts', '3'],
      ['diamonds', '4'], ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'], ['clubs', 'J'],
    );
    const a = analyzeHand(h);
    expect(longestMinor(a)).toBe('diamonds');
  });

  it('longestMinor prefers clubs when 3-3', () => {
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', '2'], ['hearts', '3'], ['hearts', '4'],
      ['diamonds', '5'], ['diamonds', '6'], ['diamonds', '7'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    const a = analyzeHand(h);
    expect(longestMinor(a)).toBe('clubs');
  });
});

describe('selectOpeningBid', () => {
  it('opens 1S with 14 HCP and 5 spades', () => {
    // A(4)+K(3)+Q(2) in spades + K(3)+Q(2) elsewhere = 14 HCP
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', '5'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'Q'], ['diamonds', '2'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(14);
    const bid = selectOpeningBid(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('spades');
  });

  it('opens 1H with 13 HCP and 5 hearts', () => {
    // A(4)+K(3)+Q(2) in hearts + A(4) in diamonds = 13 HCP
    const h = hand(
      ['spades', '7'], ['spades', '6'], ['spades', '5'],
      ['hearts', 'A'], ['hearts', 'K'], ['hearts', 'Q'], ['hearts', '4'], ['hearts', '3'],
      ['diamonds', 'A'], ['diamonds', '2'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(13);
    const bid = selectOpeningBid(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('hearts');
  });

  it('opens 1NT with 15 HCP, balanced, no 5-card major', () => {
    // 4-3-3-3: A(4)+K(3) spades + Q(2)+J(1) hearts + K(3)+J(1) diamonds + J(1) clubs = 15
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', '5'], ['spades', '4'],
      ['hearts', 'Q'], ['hearts', 'J'], ['hearts', '3'],
      ['diamonds', 'K'], ['diamonds', 'J'], ['diamonds', '2'],
      ['clubs', 'J'], ['clubs', '8'], ['clubs', '9'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(15);
    expect(a.isBalanced).toBe(true);
    expect(fiveCardMajor(a)).toBeNull();
    const bid = selectOpeningBid(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('notrump');
  });

  it('opens 1 minor with 13 HCP, no 5-card major, not 1NT shape', () => {
    // 4-4-4-1: A(4) spades + K(3) hearts + Q(2)+J(1)+J... wait
    // A(4) spades + K(3) hearts + Q(2)+K(3) diamonds + J(1) clubs = 13
    const h = hand(
      ['spades', 'A'], ['spades', '7'], ['spades', '5'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', 'Q'], ['diamonds', 'K'], ['diamonds', '7'], ['diamonds', '2'],
      ['clubs', 'J'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(13);
    expect(fiveCardMajor(a)).toBeNull();
    const bid = selectOpeningBid(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('diamonds');
  });

  it('opens 2C with 22+ HCP', () => {
    // A(4)+K(3)+Q(2)+J(1) spades + A(4)+K(3)+Q(2) hearts + A(4) diamonds + K(3) clubs = 26
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'],
      ['hearts', 'A'], ['hearts', 'K'], ['hearts', 'Q'],
      ['diamonds', 'A'], ['diamonds', '7'], ['diamonds', '2'],
      ['clubs', 'K'], ['clubs', '8'], ['clubs', '9'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBeGreaterThanOrEqual(22);
    const bid = selectOpeningBid(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(2);
    expect(cb.suit).toBe('clubs');
  });

  it('opens weak two with 6-card suit and 5-10 HCP', () => {
    // K(3)+Q(2)+J(1) = 6 HCP in spades
    const h = hand(
      ['spades', 'K'], ['spades', 'Q'], ['spades', 'J'], ['spades', '9'], ['spades', '8'], ['spades', '7'],
      ['hearts', '6'], ['hearts', '3'],
      ['diamonds', '4'], ['diamonds', '2'],
      ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(6);
    const bid = selectOpeningBid(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(2);
    expect(cb.suit).toBe('spades');
  });

  it('passes with weak hand (0-4 HCP, no weak two)', () => {
    const h = hand(
      ['spades', '7'], ['spades', '5'], ['spades', '4'], ['spades', '3'],
      ['hearts', '6'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', '8'], ['diamonds', '4'], ['diamonds', '2'],
      ['clubs', '9'], ['clubs', '5'], ['clubs', '3'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(0);
    const bid = selectOpeningBid(a);
    expect('type' in bid && bid.type === 'pass').toBe(true);
  });
});

describe('selectResponseTo1Suit', () => {
  const oneSpade: ContractBid = { level: 1, suit: 'spades' };

  it('raises major with 6-9 HCP and 3+ support', () => {
    // Q(2) spades + K(3) diamonds + J(1) clubs = 6 HCP, 3 spades
    const h = hand(
      ['spades', 'Q'], ['spades', '7'], ['spades', '4'],
      ['hearts', '6'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', 'K'], ['diamonds', '8'], ['diamonds', '4'],
      ['clubs', 'J'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(6);
    const bid = selectResponseTo1Suit(a, oneSpade);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(2);
    expect(cb.suit).toBe('spades');
  });

  it('bids 1NT with 6-9 HCP and no fit', () => {
    // K(3) hearts + Q(2) diamonds + J(1) clubs = 6 HCP, only 2 spades (no fit)
    const h = hand(
      ['spades', '7'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'Q'], ['diamonds', '8'], ['diamonds', '4'], ['diamonds', '2'],
      ['clubs', 'J'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(6);
    const bid = selectResponseTo1Suit(a, oneSpade);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('notrump');
  });

  it('passes with less than 6 HCP', () => {
    // J(1) = 1 HCP
    const h = hand(
      ['spades', '7'], ['spades', '4'], ['spades', '3'],
      ['hearts', '6'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', 'J'], ['diamonds', '8'], ['diamonds', '4'],
      ['clubs', '9'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(1);
    const bid = selectResponseTo1Suit(a, oneSpade);
    expect('type' in bid && bid.type === 'pass').toBe(true);
  });
});

describe('selectResponseTo1NT', () => {
  it('passes with 0-7 HCP', () => {
    // Q(2) = 2 HCP
    const h = hand(
      ['spades', '7'], ['spades', '4'], ['spades', '3'],
      ['hearts', 'Q'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', '8'], ['diamonds', '4'], ['diamonds', '2'],
      ['clubs', '9'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(2);
    const bid = selectResponseTo1NT(a);
    expect('type' in bid && bid.type === 'pass').toBe(true);
  });

  it('raises to 2NT with 8-9 HCP', () => {
    // A(4) spades + K(3) hearts + J(1) diamonds = 8 HCP
    const h = hand(
      ['spades', 'A'], ['spades', '7'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'J'], ['diamonds', '8'], ['diamonds', '4'],
      ['clubs', '9'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(8);
    const bid = selectResponseTo1NT(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(2);
    expect(cb.suit).toBe('notrump');
  });

  it('raises to 3NT with 10-15 HCP', () => {
    // A(4) spades + K(3) hearts + Q(2) diamonds + J(1) clubs = 10 HCP
    const h = hand(
      ['spades', 'A'], ['spades', '7'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'Q'], ['diamonds', '8'], ['diamonds', '4'],
      ['clubs', 'J'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const a = analyzeHand(h);
    expect(a.hcp).toBe(10);
    const bid = selectResponseTo1NT(a);
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(3);
    expect(cb.suit).toBe('notrump');
  });
});

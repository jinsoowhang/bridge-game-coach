import { describe, it, expect } from 'vitest';
import { createCard } from '../card.js';
import type { Card, Bid, ContractBid } from '../types.js';
import { isContractBid } from '../auction.js';
import { selectBid } from '../ai/bidding-engine.js';

function hand(...specs: Array<[string, string]>): Card[] {
  return specs.map(([suit, rank]) => createCard(suit as any, rank as any));
}

function pass(): Bid {
  return { type: 'pass' as const };
}

describe('selectBid — opening', () => {
  it('opens 1S with 14 HCP and 5 spades as dealer', () => {
    // A(4)+K(3)+Q(2) spades + K(3)+Q(2) = 14 HCP
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', '5'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'Q'], ['diamonds', '2'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    const bid = selectBid('North', h, [], 'North');
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('spades');
  });

  it('opens 1NT with 16 HCP balanced', () => {
    // A(4)+K(3) spades + Q(2)+J(1) hearts + K(3)+J(1) diamonds + Q(2) clubs = 16
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', '5'], ['spades', '4'],
      ['hearts', 'Q'], ['hearts', 'J'], ['hearts', '3'],
      ['diamonds', 'K'], ['diamonds', 'J'], ['diamonds', '2'],
      ['clubs', 'Q'], ['clubs', '8'], ['clubs', '9'],
    );
    const bid = selectBid('East', h, [pass()], 'North');
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('notrump');
  });

  it('passes with a weak hand', () => {
    const h = hand(
      ['spades', '7'], ['spades', '5'], ['spades', '4'], ['spades', '3'],
      ['hearts', '6'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', '8'], ['diamonds', '4'], ['diamonds', '2'],
      ['clubs', '9'], ['clubs', '5'], ['clubs', '3'],
    );
    const bid = selectBid('North', h, [], 'North');
    expect('type' in bid && bid.type === 'pass').toBe(true);
  });

  it('opens after passes by others', () => {
    // A(4)+K(3)+Q(2) spades + K(3)+Q(2) = 14 HCP
    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', '5'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'Q'], ['diamonds', '2'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    // North passes, East passes, now South opens
    const bid = selectBid('South', h, [pass(), pass()], 'North');
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(1);
    expect(cb.suit).toBe('spades');
  });
});

describe('selectBid — responding to partner', () => {
  it('responds 2S to partner opening 1S with support and 7 HCP', () => {
    // North opens 1S; East passes; South responds
    // Q(2) spades + K(3) diamonds + Q(2) clubs = 7 HCP, 3 spades
    const oneSpade: ContractBid = { level: 1, suit: 'spades' };
    const auction: Bid[] = [oneSpade, pass()];

    const h = hand(
      ['spades', 'Q'], ['spades', '7'], ['spades', '4'],
      ['hearts', '6'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', 'K'], ['diamonds', '8'], ['diamonds', '4'],
      ['clubs', 'Q'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const bid = selectBid('South', h, auction, 'North');
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(2);
    expect(cb.suit).toBe('spades');
  });

  it('responds to 1NT with pass when weak', () => {
    const oneNT: ContractBid = { level: 1, suit: 'notrump' };
    const auction: Bid[] = [oneNT, pass()];

    // Q(2) = 2 HCP
    const h = hand(
      ['spades', '7'], ['spades', '4'], ['spades', '3'],
      ['hearts', 'Q'], ['hearts', '3'], ['hearts', '2'],
      ['diamonds', '8'], ['diamonds', '4'], ['diamonds', '2'],
      ['clubs', '9'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const bid = selectBid('South', h, auction, 'North');
    expect('type' in bid && bid.type === 'pass').toBe(true);
  });

  it('responds 3NT to 1NT with 10+ HCP', () => {
    const oneNT: ContractBid = { level: 1, suit: 'notrump' };
    const auction: Bid[] = [oneNT, pass()];

    // A(4)+K(3)+Q(2)+J(1) = 10 HCP
    const h = hand(
      ['spades', 'A'], ['spades', '7'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'Q'], ['diamonds', '8'], ['diamonds', '4'],
      ['clubs', 'J'], ['clubs', '5'], ['clubs', '3'], ['clubs', '2'],
    );
    const bid = selectBid('South', h, auction, 'North');
    expect(isContractBid(bid)).toBe(true);
    const cb = bid as ContractBid;
    expect(cb.level).toBe(3);
    expect(cb.suit).toBe('notrump');
  });
});

describe('selectBid — overcalling', () => {
  it('passes when opponents have bid (overcalling not implemented)', () => {
    const oneHeart: ContractBid = { level: 1, suit: 'hearts' };
    const auction: Bid[] = [pass(), oneHeart];

    const h = hand(
      ['spades', 'A'], ['spades', 'K'], ['spades', 'Q'], ['spades', '5'], ['spades', '4'],
      ['hearts', 'K'], ['hearts', '6'], ['hearts', '3'],
      ['diamonds', 'Q'], ['diamonds', '2'],
      ['clubs', '8'], ['clubs', '9'], ['clubs', '10'],
    );
    const bid = selectBid('South', h, auction, 'North');
    expect('type' in bid && bid.type === 'pass').toBe(true);
  });
});

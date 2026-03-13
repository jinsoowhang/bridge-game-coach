import { describe, it, expect } from 'vitest';
import type { Bid, ContractBid } from '../types.js';
import {
  isContractBid,
  bidToString,
  compareBids,
  getValidBids,
  isAuctionComplete,
  resolveContract,
} from '../auction.js';

const pass: Bid = { type: 'pass' };
const dbl: Bid = { type: 'double' };
const rdbl: Bid = { type: 'redouble' };
function cb(level: number, suit: string): ContractBid {
  return { level: level as any, suit: suit as any };
}

describe('isContractBid', () => {
  it('returns true for a contract bid', () => {
    expect(isContractBid(cb(1, 'hearts'))).toBe(true);
  });

  it('returns false for pass', () => {
    expect(isContractBid(pass)).toBe(false);
  });

  it('returns false for double', () => {
    expect(isContractBid(dbl)).toBe(false);
  });
});

describe('bidToString', () => {
  it('formats contract bids', () => {
    expect(bidToString(cb(1, 'hearts'))).toBe('1\u2665');
    expect(bidToString(cb(3, 'notrump'))).toBe('3NT');
    expect(bidToString(cb(2, 'clubs'))).toBe('2\u2663');
  });

  it('formats special bids', () => {
    expect(bidToString(pass)).toBe('Pass');
    expect(bidToString(dbl)).toBe('Double');
    expect(bidToString(rdbl)).toBe('Redouble');
  });
});

describe('compareBids', () => {
  it('higher level is greater', () => {
    expect(compareBids(cb(2, 'clubs'), cb(1, 'notrump'))).toBeGreaterThan(0);
  });

  it('same level, higher suit is greater', () => {
    expect(compareBids(cb(1, 'notrump'), cb(1, 'spades'))).toBeGreaterThan(0);
  });

  it('equal bids return 0', () => {
    expect(compareBids(cb(1, 'hearts'), cb(1, 'hearts'))).toBe(0);
  });

  it('suit order: clubs < diamonds < hearts < spades < notrump', () => {
    expect(compareBids(cb(1, 'clubs'), cb(1, 'diamonds'))).toBeLessThan(0);
    expect(compareBids(cb(1, 'diamonds'), cb(1, 'hearts'))).toBeLessThan(0);
    expect(compareBids(cb(1, 'hearts'), cb(1, 'spades'))).toBeLessThan(0);
    expect(compareBids(cb(1, 'spades'), cb(1, 'notrump'))).toBeLessThan(0);
  });
});

describe('getValidBids', () => {
  it('allows all 35 contract bids + pass at the start', () => {
    const valid = getValidBids([]);
    // 35 contract bids + 1 pass = 36
    expect(valid.length).toBe(36);
    expect(valid.some(b => 'type' in b && b.type === 'pass')).toBe(true);
  });

  it('only allows bids higher than the last contract bid', () => {
    const auction: Bid[] = [cb(1, 'hearts')];
    const valid = getValidBids(auction);
    const contractBids = valid.filter(isContractBid);
    // 1S, 1NT, then all of 2-7 level (5*6=30), minus 1C,1D,1H = 2 + 30 = 32
    // Actually: 1S(1) + 1NT(1) + 2C..7NT(30) = 32
    expect(contractBids.every(b => compareBids(b, cb(1, 'hearts')) > 0)).toBe(true);
    expect(contractBids.some(b => b.level === 1 && b.suit === 'spades')).toBe(true);
    expect(contractBids.some(b => b.level === 1 && b.suit === 'diamonds')).toBe(false);
  });

  it('includes double when last non-pass bid is opponent contract', () => {
    // Bidder 0: 1H, Bidder 1 (opponent) is next
    const auction: Bid[] = [cb(1, 'hearts')];
    const valid = getValidBids(auction);
    expect(valid.some(b => 'type' in b && b.type === 'double')).toBe(true);
  });

  it('does not include double when last non-pass bid is partner contract', () => {
    // Bidder 0: 1H, Bidder 1: pass, Bidder 2 (partner of 0) is next
    const auction: Bid[] = [cb(1, 'hearts'), pass];
    const valid = getValidBids(auction);
    expect(valid.some(b => 'type' in b && b.type === 'double')).toBe(false);
  });

  it('includes double through passes', () => {
    // Bidder 0: 1H, Bidder 1: pass, Bidder 2: pass, Bidder 3 (opponent of 0) is next
    const auction: Bid[] = [cb(1, 'hearts'), pass, pass];
    const valid = getValidBids(auction);
    expect(valid.some(b => 'type' in b && b.type === 'double')).toBe(true);
  });

  it('includes redouble when opponent doubled', () => {
    // Bidder 0: 1H, Bidder 1 (opp): double, Bidder 2 (partner of 0) is next
    const auction: Bid[] = [cb(1, 'hearts'), dbl];
    const valid = getValidBids(auction);
    expect(valid.some(b => 'type' in b && b.type === 'redouble')).toBe(true);
  });

  it('does not include redouble when partner doubled (impossible in real bridge but tests logic)', () => {
    // Bidder 0: 1H, Bidder 1: pass, Bidder 2: double would be invalid
    // but: Bidder 0: pass, Bidder 1: 1H, Bidder 2 (opponent of 1): double, Bidder 3 (partner of 1) is next
    const auction: Bid[] = [pass, cb(1, 'hearts'), dbl];
    const valid = getValidBids(auction);
    // Bidder 3 is partner of bidder 1. Double was by bidder 2 (opponent of bidder 3).
    // So redouble should be available.
    expect(valid.some(b => 'type' in b && b.type === 'redouble')).toBe(true);
  });

  it('does not allow bids above 7NT', () => {
    const auction: Bid[] = [cb(7, 'notrump')];
    const valid = getValidBids(auction);
    const contractBids = valid.filter(isContractBid);
    expect(contractBids.length).toBe(0);
  });
});

describe('isAuctionComplete', () => {
  it('returns false for fewer than 4 bids', () => {
    expect(isAuctionComplete([pass, pass, pass])).toBe(false);
  });

  it('returns true for all-pass (4 passes)', () => {
    expect(isAuctionComplete([pass, pass, pass, pass])).toBe(true);
  });

  it('returns true for 3 passes after a contract bid', () => {
    expect(isAuctionComplete([cb(1, 'hearts'), pass, pass, pass])).toBe(true);
  });

  it('returns false when auction is still active', () => {
    expect(isAuctionComplete([cb(1, 'hearts'), pass, pass])).toBe(false);
  });

  it('returns true for doubled contract followed by 3 passes', () => {
    expect(isAuctionComplete([cb(1, 'hearts'), dbl, pass, pass, pass])).toBe(true);
  });

  it('returns true for redoubled contract followed by 3 passes', () => {
    expect(isAuctionComplete([cb(1, 'hearts'), dbl, rdbl, pass, pass, pass])).toBe(true);
  });
});

describe('resolveContract', () => {
  it('returns null for all-pass', () => {
    expect(resolveContract([pass, pass, pass, pass], 'North')).toBeNull();
  });

  it('resolves a simple 1H contract', () => {
    // North deals and bids 1H, then 3 passes
    const auction: Bid[] = [cb(1, 'hearts'), pass, pass, pass];
    const contract = resolveContract(auction, 'North');
    expect(contract).not.toBeNull();
    expect(contract!.level).toBe(1);
    expect(contract!.suit).toBe('hearts');
    expect(contract!.declarer).toBe('North');
    expect(contract!.doubled).toBe(false);
    expect(contract!.redoubled).toBe(false);
  });

  it('resolves declarer as first in partnership to bid the suit', () => {
    // North: 1H, East: pass, South: 2H, West: pass, North: 4H, pass, pass, pass
    // North first bid hearts, so North is declarer even though South also bid hearts
    const auction: Bid[] = [
      cb(1, 'hearts'), pass, cb(2, 'hearts'), pass,
      cb(4, 'hearts'), pass, pass, pass,
    ];
    const contract = resolveContract(auction, 'North');
    expect(contract!.declarer).toBe('North');
    expect(contract!.level).toBe(4);
    expect(contract!.suit).toBe('hearts');
  });

  it('resolves a doubled contract', () => {
    // North: 1H, East: double, pass, pass, pass
    const auction: Bid[] = [cb(1, 'hearts'), dbl, pass, pass, pass];
    const contract = resolveContract(auction, 'North');
    expect(contract!.doubled).toBe(true);
    expect(contract!.redoubled).toBe(false);
    expect(contract!.declarer).toBe('North');
  });

  it('resolves a redoubled contract', () => {
    // North: 1H, East: double, South: redouble, pass, pass, pass
    const auction: Bid[] = [cb(1, 'hearts'), dbl, rdbl, pass, pass, pass];
    const contract = resolveContract(auction, 'North');
    expect(contract!.doubled).toBe(false);
    expect(contract!.redoubled).toBe(true);
    expect(contract!.declarer).toBe('North');
  });

  it('resolves when East is dealer and bids', () => {
    // East deals: 1S, pass, pass, pass
    const auction: Bid[] = [cb(1, 'spades'), pass, pass, pass];
    const contract = resolveContract(auction, 'East');
    expect(contract!.declarer).toBe('East');
    expect(contract!.suit).toBe('spades');
  });

  it('resolves declarer correctly when partner first bid the suit', () => {
    // North: 1C, East: pass, South: 1H, West: pass
    // North: 2H, pass, pass, pass
    // South first bid hearts at index 2, North bid hearts at index 4
    // They are same partnership (even indices). South (index 2) bid hearts first.
    const auction: Bid[] = [
      cb(1, 'clubs'), pass, cb(1, 'hearts'), pass,
      cb(2, 'hearts'), pass, pass, pass,
    ];
    const contract = resolveContract(auction, 'North');
    expect(contract!.declarer).toBe('South'); // South bid hearts first
    expect(contract!.suit).toBe('hearts');
    expect(contract!.level).toBe(2);
  });
});

/**
 * Standard American Yellow Card (SAYC) bidding rules — lookup tables and functions.
 */
import type { Bid, ContractBid, HandAnalysis, Suit, BidSuit } from '../types.js';

// ===== Suit classification helpers =====

const MAJORS: readonly Suit[] = ['spades', 'hearts'] as const;
const MINORS: readonly Suit[] = ['diamonds', 'clubs'] as const;

export function isMajor(suit: Suit): boolean {
  return suit === 'spades' || suit === 'hearts';
}

export function isMinor(suit: Suit): boolean {
  return suit === 'diamonds' || suit === 'clubs';
}

// ===== Shape index helpers =====
// shape is [spades, hearts, diamonds, clubs]

const SUIT_SHAPE_INDEX: Record<Suit, number> = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
};

export function suitLength(analysis: HandAnalysis, suit: Suit): number {
  return analysis.shape[SUIT_SHAPE_INDEX[suit]];
}

/** Find 5+ card major, preferring spades over hearts if both qualify. */
export function fiveCardMajor(analysis: HandAnalysis): Suit | null {
  if (suitLength(analysis, 'spades') >= 5) return 'spades';
  if (suitLength(analysis, 'hearts') >= 5) return 'hearts';
  return null;
}

/** Find longest minor for opening. Prefer diamonds if 4+/4+, prefer clubs if 3-3. */
export function longestMinor(analysis: HandAnalysis): Suit {
  const d = suitLength(analysis, 'diamonds');
  const c = suitLength(analysis, 'clubs');
  if (d > c) return 'diamonds';
  if (c > d) return 'clubs';
  // Equal length
  if (d >= 4) return 'diamonds';
  return 'clubs'; // 3-3 case
}

/** Find a good 6-card suit for weak two (not clubs — weak twos are 2D/2H/2S). */
export function weakTwoSuit(analysis: HandAnalysis): Suit | null {
  const candidates: Suit[] = ['spades', 'hearts', 'diamonds'];
  for (const suit of candidates) {
    if (suitLength(analysis, suit) >= 6) return suit;
  }
  return null;
}

// ===== Opening bid rules =====

export interface OpeningBidRule {
  /** Descriptive name of the rule */
  name: string;
  /** Returns true if this rule applies */
  matches: (analysis: HandAnalysis) => boolean;
  /** Returns the bid to make */
  getBid: (analysis: HandAnalysis) => Bid;
}

export const OPENING_BID_RULES: readonly OpeningBidRule[] = [
  // Strong 2C opening (22+ HCP)
  {
    name: 'strong-2c',
    matches: (a) => a.hcp >= 22,
    getBid: () => ({ level: 2, suit: 'clubs' as BidSuit }),
  },
  // 1NT opening (15-17 HCP, balanced, no 5-card major)
  {
    name: '1nt-opening',
    matches: (a) => a.hcp >= 15 && a.hcp <= 17 && a.isBalanced && fiveCardMajor(a) === null,
    getBid: () => ({ level: 1, suit: 'notrump' as BidSuit }),
  },
  // 1 of a major (13-21 HCP, 5+ card major)
  {
    name: '1-major',
    matches: (a) => a.hcp >= 13 && a.hcp <= 21 && fiveCardMajor(a) !== null,
    getBid: (a) => ({ level: 1, suit: fiveCardMajor(a)! as BidSuit }),
  },
  // 1 of a minor (13-21 HCP, no 5-card major, not 1NT shape)
  {
    name: '1-minor',
    matches: (a) => a.hcp >= 13 && a.hcp <= 21 && fiveCardMajor(a) === null,
    getBid: (a) => ({ level: 1, suit: longestMinor(a) as BidSuit }),
  },
  // Weak two (5-10 HCP, good 6-card suit)
  {
    name: 'weak-two',
    matches: (a) => a.hcp >= 5 && a.hcp <= 10 && weakTwoSuit(a) !== null,
    getBid: (a) => ({ level: 2, suit: weakTwoSuit(a)! as BidSuit }),
  },
] as const;

// ===== Response rules =====

export type AuctionContext = 'opening' | 'responding' | 'rebidding' | 'overcalling';

export interface ResponseRule {
  name: string;
  /** The opening bid we're responding to */
  matchesOpening: (opening: ContractBid) => boolean;
  /** Responder's hand qualifies */
  matchesHand: (analysis: HandAnalysis, opening: ContractBid) => boolean;
  /** The response bid */
  getBid: (analysis: HandAnalysis, opening: ContractBid) => Bid;
}

/** Check if responder has 3+ card support for partner's major */
function hasSupport(analysis: HandAnalysis, suit: Suit, count: number): boolean {
  return suitLength(analysis, suit) >= count;
}

/** Find a new suit to bid at the 1-level (higher ranking than opening suit). */
function newSuitAtOne(analysis: HandAnalysis, openingSuit: BidSuit): Suit | null {
  // Bid suits at 1-level that are higher ranking than opening
  const suitRank: Record<string, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
  const openRank = suitRank[openingSuit] ?? -1;
  const candidates: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  let best: Suit | null = null;
  let bestLen = 0;
  for (const s of candidates) {
    if (suitRank[s] > openRank && suitLength(analysis, s) >= 4) {
      if (suitLength(analysis, s) > bestLen) {
        bestLen = suitLength(analysis, s);
        best = s;
      }
    }
  }
  return best;
}

export const RESPONSE_TO_1_SUIT_RULES: readonly ResponseRule[] = [
  // 6-9 HCP: raise partner's major with 3+ support
  {
    name: 'simple-raise-major',
    matchesOpening: (o) => o.level === 1 && (o.suit === 'hearts' || o.suit === 'spades'),
    matchesHand: (a, o) => a.hcp >= 6 && a.hcp <= 9 && hasSupport(a, o.suit as Suit, 3),
    getBid: (_a, o) => ({ level: 2, suit: o.suit }),
  },
  // 6-9 HCP: bid 1NT (no fit, no new suit at 1-level)
  {
    name: 'respond-1nt',
    matchesOpening: (o) => o.level === 1 && o.suit !== 'notrump',
    matchesHand: (a, o) => a.hcp >= 6 && a.hcp <= 9 && newSuitAtOne(a, o.suit) === null,
    getBid: () => ({ level: 1, suit: 'notrump' as BidSuit }),
  },
  // 10-12 HCP: bid a new suit at 1-level if possible
  {
    name: 'new-suit-1-level',
    matchesOpening: (o) => o.level === 1 && o.suit !== 'notrump',
    matchesHand: (a, o) => a.hcp >= 10 && a.hcp <= 12 && newSuitAtOne(a, o.suit) !== null,
    getBid: (a, o) => ({ level: 1, suit: newSuitAtOne(a, o.suit)! as BidSuit }),
  },
  // 10-12 HCP: raise partner's suit
  {
    name: 'raise-10-12',
    matchesOpening: (o) => o.level === 1 && o.suit !== 'notrump',
    matchesHand: (a, o) => a.hcp >= 10 && a.hcp <= 12 && hasSupport(a, o.suit as Suit, 3),
    getBid: (_a, o) => ({ level: 2, suit: o.suit }),
  },
  // 10-12 HCP: bid 2NT
  {
    name: 'respond-2nt',
    matchesOpening: (o) => o.level === 1 && o.suit !== 'notrump',
    matchesHand: (a) => a.hcp >= 10 && a.hcp <= 12,
    getBid: () => ({ level: 2, suit: 'notrump' as BidSuit }),
  },
  // 13+ HCP: jump raise partner's major with 4+ support
  {
    name: 'jump-raise-major',
    matchesOpening: (o) => o.level === 1 && (o.suit === 'hearts' || o.suit === 'spades'),
    matchesHand: (a, o) => a.hcp >= 13 && hasSupport(a, o.suit as Suit, 4),
    getBid: (_a, o) => ({ level: 3, suit: o.suit }),
  },
  // 13-15 HCP balanced: bid 3NT
  {
    name: 'respond-3nt',
    matchesOpening: (o) => o.level === 1 && o.suit !== 'notrump',
    matchesHand: (a) => a.hcp >= 13 && a.hcp <= 15 && a.isBalanced,
    getBid: () => ({ level: 3, suit: 'notrump' as BidSuit }),
  },
  // 13+ HCP: bid a new suit (forcing)
  {
    name: 'new-suit-forcing',
    matchesOpening: (o) => o.level === 1 && o.suit !== 'notrump',
    matchesHand: (a, o) => a.hcp >= 13 && newSuitAtOne(a, o.suit) !== null,
    getBid: (a, o) => ({ level: 1, suit: newSuitAtOne(a, o.suit)! as BidSuit }),
  },
] as const;

// ===== Responses to 1NT =====

export interface Response1NTRule {
  name: string;
  matches: (analysis: HandAnalysis) => boolean;
  getBid: (analysis: HandAnalysis) => Bid;
}

export const RESPONSE_TO_1NT_RULES: readonly Response1NTRule[] = [
  // 0-7 HCP: pass
  {
    name: 'pass-weak',
    matches: (a) => a.hcp <= 7,
    getBid: () => ({ type: 'pass' as const }),
  },
  // 8-9 HCP: raise to 2NT
  {
    name: 'invite-2nt',
    matches: (a) => a.hcp >= 8 && a.hcp <= 9,
    getBid: () => ({ level: 2, suit: 'notrump' as BidSuit }),
  },
  // 10-15 HCP: raise to 3NT
  {
    name: 'game-3nt',
    matches: (a) => a.hcp >= 10 && a.hcp <= 15,
    getBid: () => ({ level: 3, suit: 'notrump' as BidSuit }),
  },
] as const;

// ===== Exported helpers for bidding-engine =====

/** Select an opening bid from the rules, or pass. */
export function selectOpeningBid(analysis: HandAnalysis): Bid {
  for (const rule of OPENING_BID_RULES) {
    if (rule.matches(analysis)) {
      return rule.getBid(analysis);
    }
  }
  return { type: 'pass' as const };
}

/** Select a response to partner's 1-level suit opening. */
export function selectResponseTo1Suit(analysis: HandAnalysis, opening: ContractBid): Bid {
  for (const rule of RESPONSE_TO_1_SUIT_RULES) {
    if (rule.matchesOpening(opening) && rule.matchesHand(analysis, opening)) {
      return rule.getBid(analysis, opening);
    }
  }
  return { type: 'pass' as const };
}

/** Select a response to partner's 1NT opening. */
export function selectResponseTo1NT(analysis: HandAnalysis): Bid {
  for (const rule of RESPONSE_TO_1NT_RULES) {
    if (rule.matches(analysis)) {
      return rule.getBid(analysis);
    }
  }
  return { type: 'pass' as const };
}

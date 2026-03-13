import type {
  Bid,
  ContractBid,
  BidSuit,
  BidLevel,
  Contract,
  Position,
} from './types.js';
import { BID_SUITS, BID_LEVELS, POSITIONS } from './types.js';
import { SUIT_SYMBOLS } from './card.js';

// ===== Helpers =====

/** Type guard: is this a contract bid (has level and suit)? */
export function isContractBid(bid: Bid): bid is ContractBid {
  return 'level' in bid && 'suit' in bid;
}

const SUIT_SYMBOL_MAP: Record<BidSuit, string> = {
  clubs: '\u2663',
  diamonds: '\u2666',
  hearts: '\u2665',
  spades: '\u2660',
  notrump: 'NT',
};

/** Format a bid for display: "1\u2665", "Pass", "Double", "Redouble". */
export function bidToString(bid: Bid): string {
  if (isContractBid(bid)) {
    return `${bid.level}${SUIT_SYMBOL_MAP[bid.suit]}`;
  }
  if (bid.type === 'pass') return 'Pass';
  if (bid.type === 'double') return 'Double';
  return 'Redouble';
}

/** Numeric index for bid suit ordering (clubs=0 .. notrump=4). */
const BID_SUIT_ORDER: Record<BidSuit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
  notrump: 4,
};

/**
 * Compare two contract bids by level then suit.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareBids(a: ContractBid, b: ContractBid): number {
  if (a.level !== b.level) return a.level - b.level;
  return BID_SUIT_ORDER[a.suit] - BID_SUIT_ORDER[b.suit];
}

// ===== Core functions =====

/**
 * Given the current auction (list of bids in order starting from dealer),
 * return all legal bids for the next bidder.
 */
export function getValidBids(auction: Bid[]): Bid[] {
  const valid: Bid[] = [];

  // Find last contract bid
  let lastContract: ContractBid | null = null;
  for (let i = auction.length - 1; i >= 0; i--) {
    if (isContractBid(auction[i])) {
      lastContract = auction[i] as ContractBid;
      break;
    }
  }

  // Pass is always valid
  valid.push({ type: 'pass' as const });

  // All contract bids higher than the last contract bid
  for (const level of BID_LEVELS) {
    for (const suit of BID_SUITS) {
      const candidate: ContractBid = { level, suit };
      if (!lastContract || compareBids(candidate, lastContract) > 0) {
        valid.push(candidate);
      }
    }
  }

  // Double: last non-pass bid must be opponent's contract bid
  // Positions alternate: bidder index 0,2,4... are one partnership, 1,3,5... are the other
  const currentBidderIndex = auction.length;
  const lastNonPass = findLastNonPass(auction);
  if (lastNonPass !== null) {
    const { bid: lnpBid, index: lnpIndex } = lastNonPass;
    const isOpponent = (lnpIndex % 2) !== (currentBidderIndex % 2);

    if (isContractBid(lnpBid) && isOpponent) {
      valid.push({ type: 'double' as const });
    }

    if (lnpBid && 'type' in lnpBid && lnpBid.type === 'double' && isOpponent) {
      valid.push({ type: 'redouble' as const });
    }
  }

  return valid;
}

function findLastNonPass(
  auction: Bid[],
): { bid: Bid; index: number } | null {
  for (let i = auction.length - 1; i >= 0; i--) {
    const bid = auction[i];
    if (!('type' in bid) || bid.type !== 'pass') {
      return { bid, index: i };
    }
  }
  return null;
}

/**
 * Is the auction complete?
 * - 4 passes with no contract bid (all pass) => complete
 * - 3 consecutive passes after at least 1 contract bid => complete
 */
export function isAuctionComplete(auction: Bid[]): boolean {
  if (auction.length < 4) return false;

  // Check if there's been any contract bid
  const hasContract = auction.some(b => isContractBid(b));

  if (!hasContract) {
    // All pass: 4 passes
    return (
      auction.length === 4 &&
      auction.every(b => 'type' in b && b.type === 'pass')
    );
  }

  // 3 consecutive passes after at least one contract bid
  const last3 = auction.slice(-3);
  return last3.every(b => 'type' in b && b.type === 'pass');
}

/**
 * Resolve the final contract from a completed auction.
 * Returns null if all-pass.
 */
export function resolveContract(
  auction: Bid[],
  dealer: Position,
): Contract | null {
  // Find the final contract bid
  let finalContractBid: ContractBid | null = null;
  let finalContractIndex = -1;
  for (let i = auction.length - 1; i >= 0; i--) {
    if (isContractBid(auction[i])) {
      finalContractBid = auction[i] as ContractBid;
      finalContractIndex = i;
      break;
    }
  }

  if (!finalContractBid) return null;

  // Determine doubled/redoubled state
  let doubled = false;
  let redoubled = false;
  for (let i = finalContractIndex + 1; i < auction.length; i++) {
    const bid = auction[i];
    if ('type' in bid && bid.type === 'double') doubled = true;
    if ('type' in bid && bid.type === 'redouble') {
      doubled = false;
      redoubled = true;
    }
  }

  // Determine declarer: first player in winning partnership to bid that suit
  const winningPartnershipParity = finalContractIndex % 2; // 0 or 1
  const targetSuit = finalContractBid.suit;

  let declarer: Position | null = null;
  const dealerIndex = POSITIONS.indexOf(dealer);

  for (let i = 0; i < auction.length; i++) {
    if (i % 2 !== winningPartnershipParity) continue;
    const bid = auction[i];
    if (isContractBid(bid) && bid.suit === targetSuit) {
      declarer = POSITIONS[(dealerIndex + i) % 4];
      break;
    }
  }

  return {
    level: finalContractBid.level,
    suit: finalContractBid.suit,
    declarer: declarer!,
    doubled,
    redoubled,
  };
}

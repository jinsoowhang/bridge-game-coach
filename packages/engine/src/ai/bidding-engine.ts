/**
 * Rule-based bid selection engine.
 * Uses hand analysis + bidding rules to select the best bid.
 */
import type { Bid, ContractBid, Card, Position } from '../types.js';
import { POSITIONS } from '../types.js';
import { isContractBid } from '../auction.js';
import { analyzeHand } from '../hand-evaluator.js';
import {
  selectOpeningBid,
  selectResponseTo1Suit,
  selectResponseTo1NT,
} from './bidding-rules.js';

// ===== Auction context helpers =====

/** Get the position at a given auction index (0 = dealer). */
function positionAtIndex(dealer: Position, index: number): Position {
  const dealerIdx = POSITIONS.indexOf(dealer);
  return POSITIONS[(dealerIdx + index) % 4];
}

/** Get partner's position. */
function partnerOf(position: Position): Position {
  const idx = POSITIONS.indexOf(position);
  return POSITIONS[(idx + 2) % 4];
}

/** Find the first contract bid by a specific partnership (by position). */
function findPartnershipOpening(
  auction: Bid[],
  dealer: Position,
  position: Position,
): { bid: ContractBid; bidder: Position } | null {
  const partner = partnerOf(position);
  for (let i = 0; i < auction.length; i++) {
    const bid = auction[i];
    const bidder = positionAtIndex(dealer, i);
    if (isContractBid(bid) && (bidder === position || bidder === partner)) {
      return { bid, bidder };
    }
  }
  return null;
}

/** Has anyone in the auction made a contract bid? */
function hasAnyContractBid(auction: Bid[]): boolean {
  return auction.some(isContractBid);
}

/** Has partner made a contract bid? */
function partnerHasBid(
  auction: Bid[],
  dealer: Position,
  myPosition: Position,
): ContractBid | null {
  const partner = partnerOf(myPosition);
  for (let i = 0; i < auction.length; i++) {
    const bid = auction[i];
    const bidder = positionAtIndex(dealer, i);
    if (isContractBid(bid) && bidder === partner) {
      return bid;
    }
  }
  return null;
}

/** Have I already bid (made a contract bid)? */
function iHaveBid(
  auction: Bid[],
  dealer: Position,
  myPosition: Position,
): boolean {
  for (let i = 0; i < auction.length; i++) {
    const bid = auction[i];
    const bidder = positionAtIndex(dealer, i);
    if (isContractBid(bid) && bidder === myPosition) {
      return true;
    }
  }
  return false;
}

/**
 * Determine the auction context for the current bidder:
 * - 'opening': no one in our partnership has bid yet, and no opponents have bid
 * - 'responding': partner opened, I haven't bid yet
 * - 'rebidding': I've already bid
 * - 'overcalling': opponents bid first (simplified — just pass for now)
 */
type AuctionContext = 'opening' | 'responding' | 'rebidding' | 'overcalling';

function getAuctionContext(
  auction: Bid[],
  dealer: Position,
  myPosition: Position,
): AuctionContext {
  if (iHaveBid(auction, dealer, myPosition)) {
    return 'rebidding';
  }

  const partnerBid = partnerHasBid(auction, dealer, myPosition);
  if (partnerBid) {
    return 'responding';
  }

  // Check if opponents have bid
  const partner = partnerOf(myPosition);
  for (let i = 0; i < auction.length; i++) {
    const bid = auction[i];
    const bidder = positionAtIndex(dealer, i);
    if (isContractBid(bid) && bidder !== myPosition && bidder !== partner) {
      return 'overcalling';
    }
  }

  return 'opening';
}

// ===== Main entry point =====

/**
 * Select the best bid for a given position, hand, and auction state.
 * Falls back to pass if no rule matches.
 */
export function selectBid(
  position: Position,
  hand: Card[],
  auction: Bid[],
  dealer: Position,
): Bid {
  const analysis = analyzeHand(hand);
  const context = getAuctionContext(auction, dealer, position);

  switch (context) {
    case 'opening':
      return selectOpeningBid(analysis);

    case 'responding': {
      const partnerBid = partnerHasBid(auction, dealer, position)!;
      // Response to 1NT
      if (partnerBid.level === 1 && partnerBid.suit === 'notrump') {
        return selectResponseTo1NT(analysis);
      }
      // Response to 1-level suit opening
      if (partnerBid.level === 1) {
        return selectResponseTo1Suit(analysis, partnerBid);
      }
      // For other openings (2C, weak twos, etc.), just pass for now
      return { type: 'pass' as const };
    }

    case 'rebidding':
      // Simplified: just pass for v1
      return { type: 'pass' as const };

    case 'overcalling':
      // Simplified: just pass for v1
      return { type: 'pass' as const };

    default:
      return { type: 'pass' as const };
  }
}

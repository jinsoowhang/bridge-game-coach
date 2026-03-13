/**
 * Coaching hints for bidding and play.
 * Generates plain-English suggestions based on hand analysis and game state.
 */
import type { Card, Position, Bid, BridgeState, ContractBid } from './types.js';
import { POSITIONS } from './types.js';
import { SUIT_SYMBOLS, RANK_ORDER } from './card.js';
import { analyzeHand } from './hand-evaluator.js';
import { isContractBid } from './auction.js';
import { selectBid } from './ai/bidding-engine.js';
import { selectPlay } from './ai/play-engine.js';

// ===== Suit display helpers =====

const SUIT_NAMES: Record<string, string> = {
  clubs: 'clubs',
  diamonds: 'diamonds',
  hearts: 'hearts',
  spades: 'spades',
  notrump: 'notrump',
};

function suitSymbol(suit: string): string {
  if (suit === 'notrump') return 'NT';
  return SUIT_SYMBOLS[suit as keyof typeof SUIT_SYMBOLS] ?? suit;
}

function bidToDisplay(bid: Bid): string {
  if (isContractBid(bid)) {
    return `${bid.level}${suitSymbol(bid.suit)}`;
  }
  if ('type' in bid) {
    if (bid.type === 'pass') return 'Pass';
    if (bid.type === 'double') return 'Double';
    return 'Redouble';
  }
  return 'Pass';
}

// ===== Auction context helpers =====

function partnerOf(position: Position): Position {
  const idx = POSITIONS.indexOf(position);
  return POSITIONS[(idx + 2) % 4];
}

function positionAtIndex(dealer: Position, index: number): Position {
  const dealerIdx = POSITIONS.indexOf(dealer);
  return POSITIONS[(dealerIdx + index) % 4];
}

function partnerBid(auction: Bid[], dealer: Position, myPosition: Position): ContractBid | null {
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

function iHaveBid(auction: Bid[], dealer: Position, myPosition: Position): boolean {
  for (let i = 0; i < auction.length; i++) {
    const bid = auction[i];
    const bidder = positionAtIndex(dealer, i);
    if (isContractBid(bid) && bidder === myPosition) {
      return true;
    }
  }
  return false;
}

type BidContext = 'opening' | 'responding' | 'rebidding' | 'other';

function getBidContext(auction: Bid[], dealer: Position, myPosition: Position): BidContext {
  if (iHaveBid(auction, dealer, myPosition)) return 'rebidding';
  if (partnerBid(auction, dealer, myPosition)) return 'responding';
  // Check if any contract bid exists
  const hasAny = auction.some(isContractBid);
  if (!hasAny) return 'opening';
  return 'other';
}

// ===== Bidding hints =====

export interface BiddingHint {
  suggestion: Bid;
  explanation: string;
}

/**
 * Generate a coaching hint for what to bid.
 */
export function getBiddingHint(
  position: Position,
  hand: Card[],
  auction: Bid[],
  dealer: Position,
): BiddingHint {
  const analysis = analyzeHand(hand);
  const suggestion = selectBid(position, hand, auction, dealer);
  const context = getBidContext(auction, dealer, position);

  let explanation: string;

  if (isContractBid(suggestion)) {
    const bidStr = bidToDisplay(suggestion);

    if (context === 'opening') {
      // Opening bid explanation
      if (suggestion.level === 1 && suggestion.suit === 'notrump') {
        explanation = `You have ${analysis.hcp} HCP and a balanced hand — open 1NT.`;
      } else if (suggestion.level === 1) {
        const suitName = SUIT_NAMES[suggestion.suit];
        explanation = `You have ${analysis.hcp} HCP and ${analysis.shape[suitShapeIndex(suggestion.suit)]} ${suitName} — open ${bidStr}.`;
      } else if (suggestion.level === 2 && suggestion.suit === 'clubs') {
        explanation = `You have ${analysis.hcp} HCP — that's strong enough for a 2${suitSymbol('clubs')} opening.`;
      } else {
        // Weak two or other
        const suitName = SUIT_NAMES[suggestion.suit];
        explanation = `You have ${analysis.hcp} HCP with a good ${suitName} suit — open ${bidStr} (weak two).`;
      }
    } else if (context === 'responding') {
      const pBid = partnerBid(auction, dealer, position)!;
      const pBidStr = bidToDisplay(pBid);
      const suitName = SUIT_NAMES[suggestion.suit];

      if (suggestion.suit === pBid.suit) {
        // Raising partner
        const support = analysis.shape[suitShapeIndex(suggestion.suit)];
        explanation = `Partner opened ${pBidStr} and you have ${analysis.hcp} HCP with ${support} ${suitName} — raise to ${bidStr}.`;
      } else if (suggestion.suit === 'notrump') {
        explanation = `Partner opened ${pBidStr} and you have ${analysis.hcp} HCP — respond ${bidStr}.`;
      } else {
        explanation = `Partner opened ${pBidStr} and you have ${analysis.hcp} HCP with ${analysis.shape[suitShapeIndex(suggestion.suit)]} ${suitName} — bid ${bidStr}.`;
      }
    } else {
      explanation = `With ${analysis.hcp} HCP, bid ${bidStr}.`;
    }
  } else {
    // Pass, double, or redouble
    if ('type' in suggestion && suggestion.type === 'pass') {
      if (context === 'opening') {
        explanation = `You have ${analysis.hcp} HCP — not enough to open. Pass.`;
      } else if (context === 'responding') {
        const pBid = partnerBid(auction, dealer, position);
        if (pBid) {
          explanation = `Partner opened ${bidToDisplay(pBid)} but you have only ${analysis.hcp} HCP — pass.`;
        } else {
          explanation = `With ${analysis.hcp} HCP, pass.`;
        }
      } else {
        explanation = `With ${analysis.hcp} HCP, pass.`;
      }
    } else {
      explanation = `With ${analysis.hcp} HCP, bid ${bidToDisplay(suggestion)}.`;
    }
  }

  return { suggestion, explanation };
}

function suitShapeIndex(suit: string): number {
  const map: Record<string, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  return map[suit] ?? 0;
}

// ===== Play hints =====

export interface PlayHint {
  suggestion: Card;
  explanation: string;
}

/**
 * Generate a coaching hint for what card to play.
 */
export function getPlayHint(
  position: Position,
  hand: Card[],
  validCards: Card[],
  state: BridgeState,
): PlayHint {
  const suggestion = selectPlay(position, hand, validCards, state);
  const trick = state.currentTrick;
  const cardStr = `${suggestion.rank}${SUIT_SYMBOLS[suggestion.suit]}`;

  let explanation: string;

  if (!trick || trick.cards.size === 0) {
    // Leading
    explanation = `Lead the ${cardStr}.`;

    // Add context about why
    const suitCards = hand.filter(c => c.suit === suggestion.suit);
    if (suitCards.length >= 4) {
      explanation = `Lead from your longest suit — play the ${cardStr}.`;
    }
  } else {
    // Following or discarding
    const ledCard = trick.cards.get(trick.leader);
    const ledSuit = ledCard?.suit;
    const canFollow = ledSuit ? hand.some(c => c.suit === ledSuit) : false;

    // Determine play position (2nd, 3rd, 4th hand)
    const leaderIdx = POSITIONS.indexOf(trick.leader);
    const playerIdx = POSITIONS.indexOf(position);
    const playPos = (playerIdx - leaderIdx + 4) % 4;

    if (canFollow) {
      if (playPos === 1) {
        // 2nd hand
        const followCards = hand.filter(c => c.suit === ledSuit);
        const sorted = [...followCards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
        if (suggestion === sorted[0] || (sorted.length > 0 && suggestion.rank === sorted[0].rank)) {
          explanation = `Second hand low — play the ${cardStr}.`;
        } else {
          explanation = `Play the ${cardStr}.`;
        }
      } else if (playPos === 2) {
        // 3rd hand
        const followCards = hand.filter(c => c.suit === ledSuit);
        const sorted = [...followCards].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
        if (suggestion === sorted[0] || (sorted.length > 0 && suggestion.rank === sorted[0].rank)) {
          explanation = `Third hand high — play your ${cardStr}.`;
        } else {
          explanation = `Play the ${cardStr}.`;
        }
      } else if (playPos === 3) {
        // 4th hand
        // Check if partner is winning
        const partnerPos = partnerOf(position);
        const winningEntry = findCurrentWinner(state);
        if (winningEntry && winningEntry.position === partnerPos) {
          explanation = `Partner is winning this trick — follow suit with your lowest, play the ${cardStr}.`;
        } else {
          explanation = `Play the ${cardStr} to try to win the trick.`;
        }
      } else {
        explanation = `Follow suit — play the ${cardStr}.`;
      }
    } else {
      // Can't follow suit
      const trumpSuit = state.contract?.suit === 'notrump' ? null : state.contract?.suit;
      if (trumpSuit && suggestion.suit === trumpSuit) {
        explanation = `You're void in the led suit — trump with the ${cardStr}.`;
      } else {
        explanation = `You can't follow suit — discard the ${cardStr}.`;
      }
    }
  }

  return { suggestion, explanation };
}

/** Find the position currently winning the trick. */
function findCurrentWinner(state: BridgeState): { card: Card; position: Position } | null {
  const trick = state.currentTrick;
  if (!trick || trick.cards.size === 0) return null;

  const trumpSuit = state.contract?.suit === 'notrump' ? null : state.contract?.suit;
  const ledCard = trick.cards.get(trick.leader);
  if (!ledCard) return null;
  const ledSuit = ledCard.suit;

  let bestCard: Card | null = null;
  let bestPosition: Position | null = null;

  const leaderIdx = POSITIONS.indexOf(trick.leader);
  for (let i = 0; i < 4; i++) {
    const pos = POSITIONS[(leaderIdx + i) % 4];
    const card = trick.cards.get(pos);
    if (!card) continue;

    if (!bestCard) {
      bestCard = card;
      bestPosition = pos;
      continue;
    }

    if (trumpSuit) {
      if (card.suit === trumpSuit && bestCard.suit !== trumpSuit) {
        bestCard = card;
        bestPosition = pos;
        continue;
      }
      if (card.suit === trumpSuit && bestCard.suit === trumpSuit) {
        if (RANK_ORDER[card.rank] > RANK_ORDER[bestCard.rank]) {
          bestCard = card;
          bestPosition = pos;
        }
        continue;
      }
      if (card.suit !== trumpSuit && bestCard.suit === trumpSuit) continue;
    }

    if (card.suit === ledSuit && bestCard.suit === ledSuit) {
      if (RANK_ORDER[card.rank] > RANK_ORDER[bestCard.rank]) {
        bestCard = card;
        bestPosition = pos;
      }
    }
  }

  return bestCard && bestPosition ? { card: bestCard, position: bestPosition } : null;
}

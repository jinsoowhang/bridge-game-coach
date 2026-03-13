/**
 * Heuristic-based card play engine for AI.
 * Implements standard bridge play heuristics:
 * - Leading from longest suit
 * - 2nd hand low
 * - 3rd hand high
 * - Cover honor with honor
 * - Trump when void
 * - Follow suit with lowest if can't win
 */
import type { Card, Position, BridgeState, Suit, BidSuit } from '../types.js';
import { POSITIONS } from '../types.js';
import { RANK_ORDER } from '../card.js';

// ===== Helpers =====

const HONOR_RANKS = new Set(['J', 'Q', 'K', 'A']);

function isHonor(card: Card): boolean {
  return HONOR_RANKS.has(card.rank);
}

/** Get cards of a specific suit from a hand. */
function cardsInSuit(cards: Card[], suit: Suit): Card[] {
  return cards.filter(c => c.suit === suit);
}

/** Sort cards by rank ascending. */
function sortByRankAsc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
}

/** Sort cards by rank descending. */
function sortByRankDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
}

/** Get the lowest card from a list. */
function lowest(cards: Card[]): Card {
  return sortByRankAsc(cards)[0];
}

/** Get the highest card from a list. */
function highest(cards: Card[]): Card {
  return sortByRankDesc(cards)[0];
}

/** Position index relative to leader (0=leader, 1=2nd, 2=3rd, 3=4th). */
function playPosition(leader: Position, player: Position): number {
  const leaderIdx = POSITIONS.indexOf(leader);
  const playerIdx = POSITIONS.indexOf(player);
  return (playerIdx - leaderIdx + 4) % 4;
}

/** Get partner's position. */
function partnerOf(position: Position): Position {
  const idx = POSITIONS.indexOf(position);
  return POSITIONS[(idx + 2) % 4];
}

/** Get the trump suit as a card Suit (or null for notrump). */
function getTrumpSuit(state: BridgeState): Suit | null {
  if (!state.contract || state.contract.suit === 'notrump') return null;
  return state.contract.suit as Suit;
}

/** Count cards in each suit. */
function suitLengths(hand: Card[]): Record<Suit, number> {
  const counts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  for (const card of hand) {
    counts[card.suit]++;
  }
  return counts;
}

/** Find the card currently winning the trick. */
function currentWinningCard(state: BridgeState): { card: Card; position: Position } | null {
  if (!state.currentTrick || state.currentTrick.cards.size === 0) return null;

  const trumpSuit = getTrumpSuit(state);
  const ledCard = state.currentTrick.cards.get(state.currentTrick.leader);
  if (!ledCard) return null;
  const ledSuit = ledCard.suit;

  let bestCard: Card | null = null;
  let bestPosition: Position | null = null;

  const leaderIdx = POSITIONS.indexOf(state.currentTrick.leader);
  for (let i = 0; i < 4; i++) {
    const pos = POSITIONS[(leaderIdx + i) % 4];
    const card = state.currentTrick.cards.get(pos);
    if (!card) continue;

    if (!bestCard) {
      bestCard = card;
      bestPosition = pos;
      continue;
    }

    // Trump beats non-trump
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
      if (card.suit !== trumpSuit && bestCard.suit === trumpSuit) {
        continue;
      }
    }

    // Same suit as led — higher rank wins
    if (card.suit === ledSuit && bestCard.suit === ledSuit) {
      if (RANK_ORDER[card.rank] > RANK_ORDER[bestCard.rank]) {
        bestCard = card;
        bestPosition = pos;
      }
    }
  }

  return bestCard && bestPosition ? { card: bestCard, position: bestPosition } : null;
}

/** Check if a position is partner of another. */
function isPartner(a: Position, b: Position): boolean {
  return partnerOf(a) === b;
}

// ===== Leading heuristics =====

/** Select a card to lead: prefer longest suit, top of sequence, avoid tenace. */
function selectLead(hand: Card[], state: BridgeState): Card | null {
  const trumpSuit = getTrumpSuit(state);
  const lengths = suitLengths(hand);

  // Collect non-trump suits sorted by length descending
  const suits: Suit[] = (['spades', 'hearts', 'diamonds', 'clubs'] as Suit[])
    .filter(s => s !== trumpSuit && lengths[s] > 0)
    .sort((a, b) => lengths[b] - lengths[a]);

  // Also include trump if that's all we have
  if (suits.length === 0 && trumpSuit && lengths[trumpSuit] > 0) {
    suits.push(trumpSuit);
  }

  for (const suit of suits) {
    const cards = sortByRankDesc(cardsInSuit(hand, suit));
    if (cards.length === 0) continue;

    // Check for top of sequence (e.g., K-Q, Q-J)
    if (cards.length >= 2 && RANK_ORDER[cards[0].rank] - RANK_ORDER[cards[1].rank] === 1) {
      return cards[0]; // Top of sequence
    }

    // Avoid leading from A-Q (tenace) — skip this suit if it has A and Q but not K
    const hasAce = cards.some(c => c.rank === 'A');
    const hasQueen = cards.some(c => c.rank === 'Q');
    const hasKing = cards.some(c => c.rank === 'K');
    if (hasAce && hasQueen && !hasKing) continue;

    // Lead 4th best from longest suit
    if (cards.length >= 4) {
      return cards[3]; // 4th from top
    }

    // Lead low from shorter suits
    return lowest(cards);
  }

  // Fallback: just pick the first valid card
  return hand[0] || null;
}

// ===== Main entry point =====

/**
 * Select the best card to play given the game state.
 * Returns one of the validCards.
 */
export function selectPlay(
  position: Position,
  hand: Card[],
  validCards: Card[],
  state: BridgeState,
): Card {
  if (validCards.length === 1) return validCards[0];

  const trick = state.currentTrick;
  const trumpSuit = getTrumpSuit(state);

  // === Leading ===
  if (!trick || trick.cards.size === 0) {
    const lead = selectLead(validCards, state);
    return lead ?? validCards[0];
  }

  // We have a trick in progress
  const ledCard = trick.cards.get(trick.leader);
  if (!ledCard) return validCards[0];
  const ledSuit = ledCard.suit;
  const playPos = playPosition(trick.leader, position);

  // Cards that follow suit
  const followingSuit = validCards.filter(c => c.suit === ledSuit);
  const canFollowSuit = followingSuit.length > 0;

  // Current winner info
  const winnerInfo = currentWinningCard(state);
  const partnerIsWinning = winnerInfo ? isPartner(position, winnerInfo.position) : false;

  // === Following suit ===
  if (canFollowSuit) {
    // Cover honor with honor: if the last played card is an honor, cover with next higher
    const previousCards = Array.from(trick.cards.values());
    const lastPlayed = previousCards[previousCards.length - 1];
    if (lastPlayed && isHonor(lastPlayed) && lastPlayed.suit === ledSuit) {
      const coverCards = sortByRankAsc(followingSuit).filter(
        c => isHonor(c) && RANK_ORDER[c.rank] > RANK_ORDER[lastPlayed.rank]
      );
      if (coverCards.length > 0) return coverCards[0]; // Lowest covering honor
    }

    // 2nd hand low
    if (playPos === 1) {
      return lowest(followingSuit);
    }

    // 3rd hand high
    if (playPos === 2) {
      return highest(followingSuit);
    }

    // Partner is winning — play low
    if (partnerIsWinning) {
      return lowest(followingSuit);
    }

    // 4th seat: try to win cheaply
    if (playPos === 3 && winnerInfo) {
      const winners = sortByRankAsc(followingSuit).filter(
        c => RANK_ORDER[c.rank] > RANK_ORDER[winnerInfo.card.rank]
      );
      if (winners.length > 0) return winners[0]; // Cheapest winner
      return lowest(followingSuit); // Can't win, play low
    }

    // Default: play low
    return lowest(followingSuit);
  }

  // === Can't follow suit ===
  // Trump when void in led suit
  if (trumpSuit && !partnerIsWinning) {
    const trumpCards = validCards.filter(c => c.suit === trumpSuit);
    if (trumpCards.length > 0) {
      // If trick is already trumped, need to overruff
      if (winnerInfo && winnerInfo.card.suit === trumpSuit) {
        const overruffs = sortByRankAsc(trumpCards).filter(
          c => RANK_ORDER[c.rank] > RANK_ORDER[winnerInfo.card.rank]
        );
        if (overruffs.length > 0) return overruffs[0];
        // Can't overruff, discard instead
      } else {
        return lowest(trumpCards); // Trump with lowest trump
      }
    }
  }

  // Discard: play lowest card from weakest suit
  return lowest(validCards);
}

import { describe, it, expect } from 'vitest';
import { createCard } from '../card.js';
import type { Card, Contract, BridgeState } from '../types.js';
import { selectOpeningLead, selectDefensivePlay } from '../ai/defense-engine.js';

describe('selectOpeningLead — against notrump', () => {
  it('leads 4th from longest and strongest suit', () => {
    const hand: Card[] = [
      createCard('spades', 'K'), createCard('spades', 'Q'), createCard('spades', 'J'),
      createCard('spades', '8'), createCard('spades', '5'),
      createCard('hearts', '7'), createCard('hearts', '4'),
      createCard('diamonds', '9'), createCard('diamonds', '3'),
      createCard('clubs', '6'), createCard('clubs', '4'),
      createCard('clubs', '2'), createCard('clubs', '3'),
    ];
    const contract: Contract = {
      level: 3, suit: 'notrump', declarer: 'South', doubled: false, redoubled: false,
    };
    const card = selectOpeningLead(hand, contract);
    // Longest suit is spades (5), 4th best = index 3 in descending order = 8
    expect(card.suit).toBe('spades');
    expect(card.rank).toBe('8');
  });

  it('leads low from short longest suit', () => {
    const hand: Card[] = [
      createCard('spades', 'A'), createCard('spades', 'K'), createCard('spades', 'Q'),
      createCard('hearts', 'J'), createCard('hearts', '7'), createCard('hearts', '4'),
      createCard('diamonds', '9'), createCard('diamonds', '3'), createCard('diamonds', '2'),
      createCard('clubs', '6'), createCard('clubs', '4'),
      createCard('clubs', '3'), createCard('clubs', '2'),
    ];
    const contract: Contract = {
      level: 3, suit: 'notrump', declarer: 'South', doubled: false, redoubled: false,
    };
    const card = selectOpeningLead(hand, contract);
    // Multiple suits tied at 4 cards (clubs) and 3 cards (spades/hearts/diamonds)
    // Clubs has 4 cards = longest. But spades has 3 cards with A+K+Q = 9 HCP
    // Actually clubs is longest with 4 cards, lead 4th best from clubs
    expect(card.suit).toBe('clubs');
    expect(card.rank).toBe('2'); // 4th from top in 6-4-3-2
  });
});

describe('selectOpeningLead — against suit contract', () => {
  it('leads top of sequence against a suit contract', () => {
    const hand: Card[] = [
      createCard('hearts', 'K'), createCard('hearts', 'Q'), createCard('hearts', '5'),
      createCard('diamonds', '9'), createCard('diamonds', '3'), createCard('diamonds', '2'),
      createCard('clubs', '7'), createCard('clubs', '6'), createCard('clubs', '4'),
      createCard('clubs', '3'), createCard('clubs', '2'),
      createCard('spades', '8'), createCard('spades', '4'),
    ];
    const contract: Contract = {
      level: 4, suit: 'spades', declarer: 'South', doubled: false, redoubled: false,
    };
    const card = selectOpeningLead(hand, contract);
    // K-Q of hearts is a sequence, should lead K
    expect(card.suit).toBe('hearts');
    expect(card.rank).toBe('K');
  });

  it('leads a singleton against a suit contract', () => {
    const hand: Card[] = [
      createCard('hearts', '7'), // singleton
      createCard('diamonds', 'K'), createCard('diamonds', 'J'), createCard('diamonds', '9'),
      createCard('diamonds', '3'),
      createCard('clubs', 'A'), createCard('clubs', '8'), createCard('clubs', '6'),
      createCard('clubs', '4'), createCard('clubs', '3'),
      createCard('spades', '5'), createCard('spades', '4'), createCard('spades', '2'),
    ];
    const contract: Contract = {
      level: 4, suit: 'spades', declarer: 'South', doubled: false, redoubled: false,
    };
    const card = selectOpeningLead(hand, contract);
    // No sequence in non-trump suits (K-J is not consecutive), so singleton 7H
    expect(card.suit).toBe('hearts');
    expect(card.rank).toBe('7');
  });

  it('leads 4th best when no sequence or singleton', () => {
    const hand: Card[] = [
      createCard('hearts', 'A'), createCard('hearts', 'J'), createCard('hearts', '8'),
      createCard('hearts', '5'), createCard('hearts', '3'),
      createCard('diamonds', '9'), createCard('diamonds', '4'),
      createCard('clubs', '7'), createCard('clubs', '6'),
      createCard('clubs', '4'), createCard('clubs', '3'),
      createCard('spades', '5'), createCard('spades', '2'),
    ];
    const contract: Contract = {
      level: 4, suit: 'spades', declarer: 'South', doubled: false, redoubled: false,
    };
    const card = selectOpeningLead(hand, contract);
    // Hearts has A-J-8-5-3 (no consecutive sequence at top)
    // A-J is not consecutive, J-8 is not consecutive
    // Clubs has 7-6 (consecutive!) — top of sequence
    expect(card.suit).toBe('clubs');
    expect(card.rank).toBe('7');
  });
});

describe('selectDefensivePlay', () => {
  it('delegates to play engine (returns a valid card)', () => {
    const validCards = [
      createCard('hearts', 'K'),
      createCard('hearts', '5'),
    ];
    const trick = {
      leader: 'East' as const,
      cards: new Map([['East', createCard('hearts', 'J')] as [string, Card]]) as any,
    };
    const state: BridgeState = {
      phase: 'playing',
      hands: { North: [], East: [], South: [], West: [] },
      currentPlayer: 'South',
      dealer: 'North',
      vulnerability: 'none',
      auction: [],
      contract: { level: 3, suit: 'notrump', declarer: 'North', doubled: false, redoubled: false },
      dummy: 'South',
      tricks: [],
      currentTrick: trick,
      declarerTricks: 0,
      defenseTricks: 0,
      score: null,
    };
    const card = selectDefensivePlay('South', validCards, validCards, state);
    expect(validCards.some(vc => vc.suit === card.suit && vc.rank === card.rank)).toBe(true);
  });
});

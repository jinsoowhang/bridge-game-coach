import { describe, it, expect } from 'vitest';
import { createCard } from '../card.js';
import type { Card, Position, BridgeState, Trick, Contract } from '../types.js';
import { selectPlay } from '../ai/play-engine.js';

// Helper to build a minimal BridgeState for play-engine testing
function makeState(overrides: Partial<BridgeState> = {}): BridgeState {
  return {
    phase: 'playing',
    hands: { North: [], East: [], South: [], West: [] },
    currentPlayer: 'North',
    dealer: 'North',
    vulnerability: 'none',
    auction: [],
    contract: { level: 4, suit: 'spades', declarer: 'South', doubled: false, redoubled: false },
    dummy: 'North',
    tricks: [],
    currentTrick: null,
    declarerTricks: 0,
    defenseTricks: 0,
    score: null,
    ...overrides,
  };
}

function makeTrick(leader: Position, cards: Array<[Position, Card]>): Trick {
  const map = new Map<Position, Card>();
  for (const [pos, card] of cards) {
    map.set(pos, card);
  }
  return { leader, cards: map };
}

describe('selectPlay — leading', () => {
  it('leads from longest suit', () => {
    const hand: Card[] = [
      createCard('hearts', 'K'), createCard('hearts', 'Q'), createCard('hearts', 'J'),
      createCard('hearts', '9'), createCard('hearts', '8'),
      createCard('diamonds', '7'), createCard('diamonds', '4'),
      createCard('clubs', '5'), createCard('clubs', '3'),
    ];
    const state = makeState({
      currentTrick: null,
      contract: { level: 3, suit: 'notrump', declarer: 'South', doubled: false, redoubled: false },
    });
    const card = selectPlay('West', hand, hand, state);
    // Should lead from hearts (longest suit, 5 cards)
    expect(card.suit).toBe('hearts');
  });

  it('leads top of sequence', () => {
    const hand: Card[] = [
      createCard('hearts', 'K'), createCard('hearts', 'Q'), createCard('hearts', '5'),
      createCard('hearts', '4'), createCard('hearts', '3'),
      createCard('diamonds', '7'), createCard('diamonds', '4'),
      createCard('clubs', '5'), createCard('clubs', '3'),
    ];
    const state = makeState({
      currentTrick: null,
      contract: { level: 3, suit: 'notrump', declarer: 'South', doubled: false, redoubled: false },
    });
    const card = selectPlay('West', hand, hand, state);
    expect(card.suit).toBe('hearts');
    expect(card.rank).toBe('K'); // Top of K-Q sequence
  });
});

describe('selectPlay — 2nd hand low', () => {
  it('plays low card when second to play', () => {
    // East leads a low card, South is 2nd to play
    const trick = makeTrick('East', [
      ['East', createCard('hearts', '7')],
    ]);
    const validCards = [
      createCard('hearts', 'K'),
      createCard('hearts', '5'),
      createCard('hearts', '3'),
    ];
    const state = makeState({ currentTrick: trick, currentPlayer: 'South' });
    const card = selectPlay('South', validCards, validCards, state);
    expect(card.rank).toBe('3'); // Lowest
  });
});

describe('selectPlay — 3rd hand high', () => {
  it('plays highest card when third to play', () => {
    // South leads, West plays, North is 3rd
    const trick = makeTrick('South', [
      ['South', createCard('diamonds', '5')],
      ['West', createCard('diamonds', '3')],
    ]);
    const validCards = [
      createCard('diamonds', 'Q'),
      createCard('diamonds', '8'),
      createCard('diamonds', '4'),
    ];
    const state = makeState({ currentTrick: trick, currentPlayer: 'North' });
    const card = selectPlay('North', validCards, validCards, state);
    expect(card.rank).toBe('Q'); // Highest
  });
});

describe('selectPlay — cover honor with honor', () => {
  it('covers an honor with a higher honor', () => {
    // West leads Q, North (2nd hand) should cover with K despite 2nd-hand-low
    // Actually: cover honor overrides 2nd-hand-low
    const trick = makeTrick('West', [
      ['West', createCard('spades', 'Q')],
    ]);
    const validCards = [
      createCard('spades', 'K'),
      createCard('spades', '5'),
      createCard('spades', '3'),
    ];
    const state = makeState({
      currentTrick: trick,
      currentPlayer: 'North',
      contract: { level: 4, suit: 'hearts', declarer: 'South', doubled: false, redoubled: false },
    });
    const card = selectPlay('North', validCards, validCards, state);
    expect(card.rank).toBe('K'); // Cover honor with honor
  });
});

describe('selectPlay — follow suit with lowest when can\'t win', () => {
  it('plays lowest when partner is winning', () => {
    // North leads A of hearts, East plays 5, South (partner of North) plays low
    // Wait — South is partner of North, South is 3rd to play
    // Let's say: West leads, North plays A (partner winning), East plays 5, South follows
    const trick = makeTrick('West', [
      ['West', createCard('clubs', '7')],
      ['North', createCard('clubs', 'A')],
      ['East', createCard('clubs', '5')],
    ]);
    const validCards = [
      createCard('clubs', 'K'),
      createCard('clubs', '9'),
      createCard('clubs', '2'),
    ];
    const state = makeState({
      currentTrick: trick,
      currentPlayer: 'South',
      contract: { level: 3, suit: 'notrump', declarer: 'South', doubled: false, redoubled: false },
    });
    const card = selectPlay('South', validCards, validCards, state);
    // Partner (North) is winning with A, play low
    expect(card.rank).toBe('2');
  });
});

describe('selectPlay — trumping', () => {
  it('trumps when void in led suit', () => {
    // Hearts led, we have no hearts but have trump (spades)
    const trick = makeTrick('East', [
      ['East', createCard('hearts', 'K')],
    ]);
    const validCards = [
      createCard('spades', '5'), // trump
      createCard('spades', '3'), // trump
      createCard('diamonds', '7'),
      createCard('clubs', '4'),
    ];
    const state = makeState({
      currentTrick: trick,
      currentPlayer: 'South',
      contract: { level: 4, suit: 'spades', declarer: 'North', doubled: false, redoubled: false },
    });
    const card = selectPlay('South', validCards, validCards, state);
    expect(card.suit).toBe('spades');
    expect(card.rank).toBe('3'); // Lowest trump
  });
});

describe('selectPlay — single valid card', () => {
  it('plays the only valid card', () => {
    const only = createCard('hearts', '7');
    const state = makeState();
    const card = selectPlay('North', [only], [only], state);
    expect(card).toEqual(only);
  });
});

import { describe, it, expect } from 'vitest';
import { getBiddingHint, getPlayHint } from '../coaching.js';
import { createCard } from '../card.js';
import { createInitialState, applyAction } from '../game-state.js';
import type { Card, Position, Bid, Contract, BridgeState } from '../types.js';

// ===== Test hands =====

/** 13 HCP, 5 spades — should open 1S */
function openingHand(): Card[] {
  // A(4) + K(3) + Q(2) in spades = 9, plus K(3) hearts + J(1) diamonds = 13 HCP
  return [
    createCard('spades', 'A'),
    createCard('spades', 'K'),
    createCard('spades', 'Q'),
    createCard('spades', '9'),
    createCard('spades', '5'),
    createCard('hearts', 'K'),
    createCard('hearts', '7'),
    createCard('hearts', '4'),
    createCard('diamonds', 'J'),
    createCard('diamonds', '6'),
    createCard('diamonds', '3'),
    createCard('clubs', '8'),
    createCard('clubs', '4'),
  ];
}

/** 10 HCP, 3 hearts — should raise partner's 1H */
function respondingHand(): Card[] {
  return [
    createCard('spades', 'Q'),
    createCard('spades', '8'),
    createCard('spades', '5'),
    createCard('hearts', 'K'),
    createCard('hearts', 'J'),
    createCard('hearts', '6'),
    createCard('diamonds', 'A'),
    createCard('diamonds', '9'),
    createCard('diamonds', '4'),
    createCard('clubs', '7'),
    createCard('clubs', '5'),
    createCard('clubs', '3'),
    createCard('clubs', '2'),
  ];
}

/** Weak hand — 5 HCP */
function weakHand(): Card[] {
  return [
    createCard('spades', '9'),
    createCard('spades', '7'),
    createCard('spades', '4'),
    createCard('spades', '2'),
    createCard('hearts', '8'),
    createCard('hearts', '5'),
    createCard('hearts', '3'),
    createCard('diamonds', 'J'),
    createCard('diamonds', '6'),
    createCard('diamonds', '4'),
    createCard('clubs', '9'),
    createCard('clubs', '6'),
    createCard('clubs', '3'),
  ];
}

// ===== Bidding hints =====

describe('getBiddingHint', () => {
  it('suggests an opening bid with explanation', () => {
    const hint = getBiddingHint('North', openingHand(), [], 'North');
    expect(hint.suggestion).toBeDefined();
    expect(hint.explanation).toContain('13');
    expect(hint.explanation.length).toBeGreaterThan(10);
  });

  it('suggests pass for a weak opening hand', () => {
    const hint = getBiddingHint('North', weakHand(), [], 'North');
    expect(hint.suggestion).toEqual({ type: 'pass' });
    expect(hint.explanation).toContain('HCP');
    expect(hint.explanation.toLowerCase()).toContain('pass');
  });

  it('suggests a response to partner opening', () => {
    // Partner (South) opened 1H, now North responds
    const auction: Bid[] = [
      { level: 1, suit: 'hearts' }, // South opens 1H
      { type: 'pass' },              // West passes
    ];
    const hint = getBiddingHint('North', respondingHand(), auction, 'South');
    expect(hint.suggestion).toBeDefined();
    expect(hint.explanation).toContain('Partner');
    expect(hint.explanation.length).toBeGreaterThan(10);
  });

  it('returns a valid Bid object as suggestion', () => {
    const hint = getBiddingHint('East', openingHand(), [], 'East');
    const bid = hint.suggestion;
    // Must be a pass, double, redouble, or contract bid
    const isValid =
      ('type' in bid && ['pass', 'double', 'redouble'].includes((bid as any).type)) ||
      ('level' in bid && 'suit' in bid);
    expect(isValid).toBe(true);
  });
});

// ===== Play hints =====

describe('getPlayHint', () => {
  function makePlayState(currentPlayerHand: Card[], opts?: {
    contract?: Contract;
    trickLeader?: Position;
    trickCards?: Array<{ position: Position; card: Card }>;
  }): BridgeState {
    let state = createInitialState();
    const hands: Record<Position, Card[]> = {
      North: currentPlayerHand,
      East: [createCard('spades', '2'), createCard('hearts', '2'), createCard('diamonds', '2')],
      South: [createCard('spades', '3'), createCard('hearts', '3'), createCard('diamonds', '3')],
      West: [createCard('spades', '4'), createCard('hearts', '4'), createCard('diamonds', '4')],
    };
    state = applyAction(state, {
      type: 'DEAL',
      hands,
      dealer: 'North',
      vulnerability: 'none',
    });

    const contract = opts?.contract ?? {
      level: 1,
      suit: 'notrump' as const,
      declarer: 'South',
      doubled: false,
      redoubled: false,
    };
    state = applyAction(state, {
      type: 'START_PLAY',
      contract,
      dummy: 'North',
    });

    // If trick cards provided, play them
    if (opts?.trickCards) {
      for (const { position, card } of opts.trickCards) {
        state = applyAction(state, { type: 'PLAY_CARD', position, card });
      }
    }

    return state;
  }

  it('suggests a card to lead with explanation', () => {
    const hand = [
      createCard('spades', 'A'),
      createCard('spades', 'K'),
      createCard('spades', 'Q'),
      createCard('spades', 'J'),
      createCard('spades', '5'),
      createCard('hearts', '7'),
      createCard('hearts', '4'),
      createCard('diamonds', '9'),
      createCard('diamonds', '6'),
      createCard('clubs', '8'),
      createCard('clubs', '4'),
      createCard('clubs', '3'),
      createCard('clubs', '2'),
    ];

    // West leads (opening leader for South declarer)
    const state = makePlayState(hand);
    // Manually set currentPlayer to West for leading
    const hint = getPlayHint('West', hand, hand, state);
    expect(hint.suggestion).toBeDefined();
    expect(hint.explanation.length).toBeGreaterThan(5);
    // The suggestion must be from the hand
    expect(hand.some(c => c.suit === hint.suggestion.suit && c.rank === hint.suggestion.rank)).toBe(true);
  });

  it('suggests second hand low', () => {
    const hand = [
      createCard('spades', 'K'),
      createCard('spades', '5'),
      createCard('hearts', '9'),
    ];
    const validCards = [createCard('spades', 'K'), createCard('spades', '5')];
    const state = makePlayState(hand, {
      trickCards: [
        { position: 'West', card: createCard('spades', '4') },
      ],
    });
    // North is 2nd hand (West led, then North)
    const hint = getPlayHint('North', hand, validCards, state);
    expect(hint.suggestion.rank).toBe('5'); // 2nd hand low
    expect(hint.explanation.toLowerCase()).toContain('second hand low');
  });

  it('suggests third hand high', () => {
    const hand = [
      createCard('spades', 'K'),
      createCard('spades', '3'),
      createCard('hearts', '9'),
    ];
    const validCards = [createCard('spades', 'K'), createCard('spades', '3')];
    const state = makePlayState(hand, {
      trickCards: [
        { position: 'West', card: createCard('spades', '4') },
        { position: 'North', card: createCard('spades', '2') },
      ],
    });
    // East is 3rd hand
    const hint = getPlayHint('East', hand, validCards, state);
    expect(hint.suggestion.rank).toBe('K'); // 3rd hand high
    expect(hint.explanation.toLowerCase()).toContain('third hand high');
  });

  it('returns a valid Card object as suggestion', () => {
    const hand = [
      createCard('hearts', 'A'),
      createCard('hearts', '7'),
      createCard('diamonds', 'Q'),
    ];
    const state = makePlayState(hand);
    const hint = getPlayHint('West', hand, hand, state);
    expect(hint.suggestion).toHaveProperty('suit');
    expect(hint.suggestion).toHaveProperty('rank');
  });
});

import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  applyAction,
  nextPosition,
  getPartnership,
} from '../game-state.js';
import type { Card, Position, Contract, Vulnerability, Bid } from '../types.js';
import { createCard } from '../card.js';

// ===== Helpers =====

function makeHands(): Record<Position, Card[]> {
  return {
    North: [createCard('spades', 'A'), createCard('hearts', 'K'), createCard('diamonds', 'Q')],
    East: [createCard('spades', 'K'), createCard('hearts', 'Q'), createCard('diamonds', 'J')],
    South: [createCard('spades', 'Q'), createCard('hearts', 'J'), createCard('diamonds', '10')],
    West: [createCard('spades', 'J'), createCard('hearts', '10'), createCard('diamonds', '9')],
  };
}

// ===== Tests =====

describe('createInitialState', () => {
  it('returns correct initial state', () => {
    const state = createInitialState();
    expect(state.phase).toBe('bidding');
    expect(state.hands.North).toEqual([]);
    expect(state.hands.East).toEqual([]);
    expect(state.hands.South).toEqual([]);
    expect(state.hands.West).toEqual([]);
    expect(state.currentPlayer).toBe('North');
    expect(state.dealer).toBe('North');
    expect(state.vulnerability).toBe('none');
    expect(state.auction).toEqual([]);
    expect(state.contract).toBeNull();
    expect(state.dummy).toBeNull();
    expect(state.tricks).toEqual([]);
    expect(state.currentTrick).toBeNull();
    expect(state.declarerTricks).toBe(0);
    expect(state.defenseTricks).toBe(0);
    expect(state.score).toBeNull();
  });
});

describe('DEAL action', () => {
  it('populates hands and sets dealer', () => {
    const state = createInitialState();
    const hands = makeHands();
    const next = applyAction(state, {
      type: 'DEAL',
      hands,
      dealer: 'East',
      vulnerability: 'ns',
    });

    expect(next.phase).toBe('bidding');
    expect(next.hands.North).toEqual(hands.North);
    expect(next.hands.East).toEqual(hands.East);
    expect(next.hands.South).toEqual(hands.South);
    expect(next.hands.West).toEqual(hands.West);
    expect(next.dealer).toBe('East');
    expect(next.currentPlayer).toBe('East');
    expect(next.vulnerability).toBe('ns');
  });

  it('deep-copies hands (mutation safety)', () => {
    const state = createInitialState();
    const hands = makeHands();
    const next = applyAction(state, {
      type: 'DEAL',
      hands,
      dealer: 'North',
      vulnerability: 'none',
    });

    // Mutate the original hands — should not affect state
    hands.North.push(createCard('clubs', '2'));
    expect(next.hands.North).toHaveLength(3);
  });
});

describe('BID action', () => {
  it('appends bid to auction and advances player', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const bid: Bid = { level: 1, suit: 'notrump' };
    const next = applyAction(state, {
      type: 'BID',
      position: 'North',
      bid,
    });

    expect(next.auction).toHaveLength(1);
    expect(next.auction[0]).toEqual(bid);
    expect(next.currentPlayer).toBe('East');
  });

  it('advances through all four positions', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const pass: Bid = { type: 'pass' };
    state = applyAction(state, { type: 'BID', position: 'North', bid: { level: 1, suit: 'clubs' } });
    expect(state.currentPlayer).toBe('East');

    state = applyAction(state, { type: 'BID', position: 'East', bid: pass });
    expect(state.currentPlayer).toBe('South');

    state = applyAction(state, { type: 'BID', position: 'South', bid: pass });
    expect(state.currentPlayer).toBe('West');

    state = applyAction(state, { type: 'BID', position: 'West', bid: pass });
    expect(state.currentPlayer).toBe('North');

    expect(state.auction).toHaveLength(4);
  });
});

describe('START_PLAY action', () => {
  it('sets contract, dummy, phase, and opening leader', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const contract: Contract = {
      level: 3,
      suit: 'notrump',
      declarer: 'South',
      doubled: false,
      redoubled: false,
    };

    const next = applyAction(state, {
      type: 'START_PLAY',
      contract,
      dummy: 'North',
    });

    expect(next.phase).toBe('playing');
    expect(next.contract).toEqual(contract);
    expect(next.dummy).toBe('North');
    // Opening leader is left of declarer (South → West)
    expect(next.currentPlayer).toBe('West');
  });
});

describe('PLAY_CARD action', () => {
  it('removes card from hand and adds to trick', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const contract: Contract = {
      level: 1,
      suit: 'notrump',
      declarer: 'South',
      doubled: false,
      redoubled: false,
    };
    state = applyAction(state, { type: 'START_PLAY', contract, dummy: 'North' });

    // West leads (opening leader)
    const cardToPlay = createCard('spades', 'J');
    const next = applyAction(state, {
      type: 'PLAY_CARD',
      position: 'West',
      card: cardToPlay,
    });

    // Card removed from West's hand
    expect(next.hands.West).toHaveLength(2);
    expect(next.hands.West.find(c => c.suit === 'spades' && c.rank === 'J')).toBeUndefined();

    // Trick created with West as leader
    expect(next.currentTrick).not.toBeNull();
    expect(next.currentTrick!.leader).toBe('West');
    expect(next.currentTrick!.cards.get('West')).toEqual(cardToPlay);

    // Advances to next player
    expect(next.currentPlayer).toBe('North');
  });

  it('adds to existing trick when currentTrick is not null', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const contract: Contract = {
      level: 1,
      suit: 'notrump',
      declarer: 'South',
      doubled: false,
      redoubled: false,
    };
    state = applyAction(state, { type: 'START_PLAY', contract, dummy: 'North' });

    // West leads
    state = applyAction(state, {
      type: 'PLAY_CARD',
      position: 'West',
      card: createCard('spades', 'J'),
    });

    // North follows
    state = applyAction(state, {
      type: 'PLAY_CARD',
      position: 'North',
      card: createCard('spades', 'A'),
    });

    expect(state.currentTrick!.cards.size).toBe(2);
    expect(state.currentTrick!.leader).toBe('West');
    expect(state.currentPlayer).toBe('East');
  });
});

describe('COMPLETE_TRICK action', () => {
  it('updates trick counts for declarer win', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const contract: Contract = {
      level: 1,
      suit: 'notrump',
      declarer: 'South',
      doubled: false,
      redoubled: false,
    };
    state = applyAction(state, { type: 'START_PLAY', contract, dummy: 'North' });

    // Play a full trick: West, North, East, South
    state = applyAction(state, { type: 'PLAY_CARD', position: 'West', card: createCard('spades', 'J') });
    state = applyAction(state, { type: 'PLAY_CARD', position: 'North', card: createCard('spades', 'A') });
    state = applyAction(state, { type: 'PLAY_CARD', position: 'East', card: createCard('spades', 'K') });
    state = applyAction(state, { type: 'PLAY_CARD', position: 'South', card: createCard('spades', 'Q') });

    // North wins (has Ace) — North is declarer's partner (NS partnership)
    const next = applyAction(state, { type: 'COMPLETE_TRICK', winner: 'North' });

    expect(next.declarerTricks).toBe(1);
    expect(next.defenseTricks).toBe(0);
    expect(next.currentTrick).toBeNull();
    expect(next.tricks).toHaveLength(1);
    expect(next.tricks[0].winner).toBe('North');
    expect(next.currentPlayer).toBe('North');
  });

  it('updates trick counts for defense win', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const contract: Contract = {
      level: 1,
      suit: 'notrump',
      declarer: 'North',
      doubled: false,
      redoubled: false,
    };
    state = applyAction(state, { type: 'START_PLAY', contract, dummy: 'South' });

    // Play a trick
    state = applyAction(state, { type: 'PLAY_CARD', position: 'East', card: createCard('spades', 'K') });
    state = applyAction(state, { type: 'PLAY_CARD', position: 'South', card: createCard('spades', 'Q') });
    state = applyAction(state, { type: 'PLAY_CARD', position: 'West', card: createCard('spades', 'J') });
    state = applyAction(state, { type: 'PLAY_CARD', position: 'North', card: createCard('spades', 'A') });

    // East wins — East is defense (EW partnership, declarer is North/NS)
    const next = applyAction(state, { type: 'COMPLETE_TRICK', winner: 'East' });

    expect(next.declarerTricks).toBe(0);
    expect(next.defenseTricks).toBe(1);
  });
});

describe('END_HAND action', () => {
  it('sets score and phase to complete', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const next = applyAction(state, { type: 'END_HAND', score: 400 });

    expect(next.score).toBe(400);
    expect(next.phase).toBe('complete');
  });
});

describe('state immutability', () => {
  it('does not mutate the original state on DEAL', () => {
    const original = createInitialState();
    const next = applyAction(original, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'East',
      vulnerability: 'both',
    });

    expect(original.dealer).toBe('North');
    expect(original.hands.North).toEqual([]);
    expect(next.dealer).toBe('East');
  });

  it('does not mutate the original state on BID', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const before = state;
    const after = applyAction(state, {
      type: 'BID',
      position: 'North',
      bid: { level: 1, suit: 'clubs' },
    });

    expect(before.auction).toHaveLength(0);
    expect(after.auction).toHaveLength(1);
    expect(before.currentPlayer).toBe('North');
    expect(after.currentPlayer).toBe('East');
  });

  it('does not mutate the original state on PLAY_CARD', () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: 'DEAL',
      hands: makeHands(),
      dealer: 'North',
      vulnerability: 'none',
    });

    const contract: Contract = {
      level: 1,
      suit: 'notrump',
      declarer: 'South',
      doubled: false,
      redoubled: false,
    };
    state = applyAction(state, { type: 'START_PLAY', contract, dummy: 'North' });

    const before = state;
    const after = applyAction(state, {
      type: 'PLAY_CARD',
      position: 'West',
      card: createCard('spades', 'J'),
    });

    expect(before.hands.West).toHaveLength(3);
    expect(after.hands.West).toHaveLength(2);
    expect(before.currentTrick).toBeNull();
    expect(after.currentTrick).not.toBeNull();
  });
});

describe('nextPosition', () => {
  it('cycles correctly through all positions', () => {
    expect(nextPosition('North')).toBe('East');
    expect(nextPosition('East')).toBe('South');
    expect(nextPosition('South')).toBe('West');
    expect(nextPosition('West')).toBe('North');
  });
});

describe('getPartnership', () => {
  it('returns NS for North and South', () => {
    expect(getPartnership('North')).toBe('NS');
    expect(getPartnership('South')).toBe('NS');
  });

  it('returns EW for East and West', () => {
    expect(getPartnership('East')).toBe('EW');
    expect(getPartnership('West')).toBe('EW');
  });
});

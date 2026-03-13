import { describe, it, expect, vi } from 'vitest';
import { GameLoop } from '../game-loop.js';
import type {
  BridgeState,
  BridgeEvent,
  BridgeEventType,
  Position,
  Bid,
  Card,
} from '../types.js';
import { selectBid } from '../ai/bidding-engine.js';
import { selectPlay } from '../ai/play-engine.js';
import { getValidPlays } from '../trick.js';

// ===== Mock providers =====

/** AI bid provider that uses the bidding engine. */
async function aiBidProvider(
  position: Position,
  validBids: Bid[],
  state: BridgeState,
): Promise<Bid> {
  return selectBid(position, state.hands[position], state.auction, state.dealer);
}

/** AI play provider that uses the play engine. */
async function aiPlayProvider(
  position: Position,
  validCards: Card[],
  state: BridgeState,
): Promise<Card> {
  // When called for declarer controlling dummy, we need to use the current player's hand
  const currentPlayer = state.currentPlayer;
  const hand = state.hands[currentPlayer];
  return selectPlay(position, hand, validCards, state);
}

/** Provider that always passes. */
async function alwaysPassProvider(): Promise<Bid> {
  return { type: 'pass' };
}

// ===== Tests =====

describe('GameLoop', () => {
  it('plays a complete hand with AI providers', async () => {
    const events: BridgeEventType[] = [];

    const loop = new GameLoop({
      dealer: 'North',
      vulnerability: 'none',
      onEvent: (event: BridgeEvent) => {
        events.push(event.type);
      },
      getBid: aiBidProvider,
      getPlay: aiPlayProvider,
    });

    const finalState = await loop.playHand();

    // Must reach complete phase
    expect(finalState.phase).toBe('complete');

    // Must have dealt
    expect(events).toContain('HAND_DEALT');

    // Must have HAND_COMPLETE
    expect(events).toContain('HAND_COMPLETE');

    // Score must be set
    expect(finalState.score).not.toBeNull();

    // Total tricks must be 13 (if a contract was played)
    if (finalState.contract) {
      expect(finalState.declarerTricks + finalState.defenseTricks).toBe(13);
      expect(finalState.tricks).toHaveLength(13);
    }
  });

  it('handles all-pass scenario', async () => {
    const events: BridgeEventType[] = [];

    const loop = new GameLoop({
      dealer: 'North',
      vulnerability: 'none',
      onEvent: (event: BridgeEvent) => {
        events.push(event.type);
      },
      getBid: alwaysPassProvider,
      getPlay: aiPlayProvider,
    });

    const finalState = await loop.playHand();

    expect(finalState.phase).toBe('complete');
    expect(finalState.score).toBe(0);
    expect(finalState.contract).toBeNull();
    expect(events).toContain('HAND_DEALT');
    expect(events).toContain('HAND_COMPLETE');
    // Should NOT have play-phase events
    expect(events).not.toContain('TRICK_COMPLETE');
    expect(events).not.toContain('DUMMY_REVEALED');
  });

  it('emits events in correct order', async () => {
    const events: BridgeEventType[] = [];

    const loop = new GameLoop({
      dealer: 'North',
      vulnerability: 'none',
      onEvent: (event: BridgeEvent) => {
        events.push(event.type);
      },
      getBid: aiBidProvider,
      getPlay: aiPlayProvider,
    });

    await loop.playHand();

    // HAND_DEALT must be first
    expect(events[0]).toBe('HAND_DEALT');

    // HAND_COMPLETE must be last
    expect(events[events.length - 1]).toBe('HAND_COMPLETE');

    // If there's a contract, check order
    if (events.includes('AUCTION_COMPLETE')) {
      const auctionCompleteIdx = events.indexOf('AUCTION_COMPLETE');
      const dummyRevealedIdx = events.indexOf('DUMMY_REVEALED');
      const firstTrickComplete = events.indexOf('TRICK_COMPLETE');

      // AUCTION_COMPLETE before DUMMY_REVEALED
      expect(auctionCompleteIdx).toBeLessThan(dummyRevealedIdx);

      // DUMMY_REVEALED before first trick
      expect(dummyRevealedIdx).toBeLessThan(firstTrickComplete);
    }
  });

  it('calls onEvent handler for each event', async () => {
    const onEvent = vi.fn();

    const loop = new GameLoop({
      dealer: 'South',
      vulnerability: 'ew',
      onEvent,
      getBid: aiBidProvider,
      getPlay: aiPlayProvider,
    });

    await loop.playHand();

    // At minimum: HAND_DEALT + bid events + HAND_COMPLETE
    expect(onEvent).toHaveBeenCalled();

    // Every call should have a state object
    for (const call of onEvent.mock.calls) {
      const event = call[0] as BridgeEvent;
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('state');
      expect(event.state).toHaveProperty('phase');
    }
  });

  it('resolves auction correctly', async () => {
    const events: BridgeEvent[] = [];

    const loop = new GameLoop({
      dealer: 'North',
      vulnerability: 'none',
      onEvent: (event: BridgeEvent) => {
        events.push(event);
      },
      getBid: aiBidProvider,
      getPlay: aiPlayProvider,
    });

    const finalState = await loop.playHand();

    if (finalState.contract) {
      // Auction should have bids
      expect(finalState.auction.length).toBeGreaterThanOrEqual(4);

      // Contract should have valid fields
      expect(finalState.contract.level).toBeGreaterThanOrEqual(1);
      expect(finalState.contract.level).toBeLessThanOrEqual(7);
      expect(finalState.contract.declarer).toBeDefined();
    }
  });

  it('plays all 13 tricks when contract exists', async () => {
    let trickCompleteCount = 0;

    const loop = new GameLoop({
      dealer: 'East',
      vulnerability: 'both',
      onEvent: (event: BridgeEvent) => {
        if (event.type === 'TRICK_COMPLETE') {
          trickCompleteCount++;
        }
      },
      getBid: aiBidProvider,
      getPlay: aiPlayProvider,
    });

    const finalState = await loop.playHand();

    if (finalState.contract) {
      expect(trickCompleteCount).toBe(13);

      // All hands should be empty
      expect(finalState.hands.North).toHaveLength(0);
      expect(finalState.hands.East).toHaveLength(0);
      expect(finalState.hands.South).toHaveLength(0);
      expect(finalState.hands.West).toHaveLength(0);
    }
  });

  it('currentState reflects the live state', async () => {
    const loop = new GameLoop({
      dealer: 'North',
      vulnerability: 'none',
      onEvent: () => {},
      getBid: aiBidProvider,
      getPlay: aiPlayProvider,
    });

    // Before playing, state should be initial
    expect(loop.currentState.phase).toBe('bidding');

    await loop.playHand();

    // After playing, state should be complete
    expect(loop.currentState.phase).toBe('complete');
  });

  it('applies scoring after play', async () => {
    const loop = new GameLoop({
      dealer: 'West',
      vulnerability: 'ns',
      onEvent: () => {},
      getBid: aiBidProvider,
      getPlay: aiPlayProvider,
    });

    const finalState = await loop.playHand();

    if (finalState.contract) {
      // Score should be a number (could be positive or negative)
      expect(typeof finalState.score).toBe('number');
      expect(finalState.score).not.toBe(null);
    }
  });
});

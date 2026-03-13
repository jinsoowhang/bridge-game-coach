/**
 * Game loop orchestrator — coordinates a full hand of Bridge.
 * Deal -> Auction -> Play 13 tricks -> Score.
 */
import type {
  BridgeState,
  Position,
  Vulnerability,
  BridgeEventHandler,
  BidProvider,
  PlayProvider,
  Card,
} from './types.js';
import { POSITIONS } from './types.js';
import { createDeck, shuffleDeck, dealHands } from './deck.js';
import { createInitialState, applyAction, nextPosition } from './game-state.js';
import { getValidBids, isAuctionComplete, resolveContract } from './auction.js';
import { getValidPlays, determineTrickWinner, isTrickComplete } from './trick.js';
import { scoreContract } from './scoring.js';

// ===== Types =====

export interface GameLoopConfig {
  dealer: Position;
  vulnerability: Vulnerability;
  onEvent: BridgeEventHandler;
  getBid: BidProvider;
  getPlay: PlayProvider;
}

// ===== GameLoop =====

export class GameLoop {
  private state: BridgeState;
  private readonly config: GameLoopConfig;

  constructor(config: GameLoopConfig) {
    this.config = config;
    this.state = createInitialState();
  }

  get currentState(): BridgeState {
    return this.state;
  }

  /**
   * Play one complete hand of bridge.
   * Returns the final state after scoring.
   */
  async playHand(): Promise<BridgeState> {
    // 1. Deal
    const deck = shuffleDeck(createDeck());
    const hands = dealHands(deck);

    this.state = applyAction(this.state, {
      type: 'DEAL',
      hands,
      dealer: this.config.dealer,
      vulnerability: this.config.vulnerability,
    });

    this.emit('HAND_DEALT');

    // 2. Auction phase
    await this.runAuction();

    // Check for all-pass
    if (!this.state.contract) {
      // All pass — no contract
      this.state = applyAction(this.state, { type: 'END_HAND', score: 0 });
      this.emit('HAND_COMPLETE');
      return this.state;
    }

    // 3. Play phase
    await this.runPlay();

    return this.state;
  }

  private async runAuction(): Promise<void> {
    while (true) {
      const validBids = getValidBids(this.state.auction);
      const position = this.state.currentPlayer;

      this.emit('AWAITING_BID', { position, validBids });

      const bid = await this.config.getBid(position, validBids, this.state);

      this.state = applyAction(this.state, {
        type: 'BID',
        position,
        bid,
      });

      this.emit('BID_MADE', { position, bid });

      if (isAuctionComplete(this.state.auction)) {
        const contract = resolveContract(this.state.auction, this.config.dealer);

        if (contract) {
          // Resolve contract into state
          const dummy = partnerOf(contract.declarer);
          this.state = applyAction(this.state, {
            type: 'START_PLAY',
            contract,
            dummy,
          });
          this.emit('AUCTION_COMPLETE', { contract });
          this.emit('DUMMY_REVEALED', { dummy, hand: this.state.hands[dummy] });
        }
        // If contract is null, it's all-pass — handled by caller
        break;
      }
    }
  }

  private async runPlay(): Promise<void> {
    const contract = this.state.contract!;
    const dummy = this.state.dummy!;
    const declarer = contract.declarer;
    const trumpSuit = contract.suit;

    // Play 13 tricks
    for (let trickNum = 0; trickNum < 13; trickNum++) {
      // Play 4 cards per trick
      for (let cardNum = 0; cardNum < 4; cardNum++) {
        const currentPlayer = this.state.currentPlayer;
        const hand = this.state.hands[currentPlayer];
        const validCards = getValidPlays(hand, this.state.currentTrick, trumpSuit);

        this.emit('AWAITING_PLAY', { position: currentPlayer, validCards });

        // Dummy routing: when it's dummy's turn, call getPlay with declarer's position
        const controllingPlayer = currentPlayer === dummy ? declarer : currentPlayer;

        const card = await this.config.getPlay(controllingPlayer, validCards, this.state);

        this.state = applyAction(this.state, {
          type: 'PLAY_CARD',
          position: currentPlayer,
          card,
        });

        this.emit('CARD_PLAYED', { position: currentPlayer, card });
      }

      // Determine trick winner
      const completedTrick = this.state.currentTrick!;
      const winner = determineTrickWinner(completedTrick, trumpSuit);

      this.state = applyAction(this.state, {
        type: 'COMPLETE_TRICK',
        winner,
      });

      this.emit('TRICK_COMPLETE', {
        trickNumber: trickNum + 1,
        winner,
        declarerTricks: this.state.declarerTricks,
        defenseTricks: this.state.defenseTricks,
      });
    }

    // Score the hand
    const score = scoreContract(
      contract,
      this.config.vulnerability,
      this.state.declarerTricks,
    );

    this.state = applyAction(this.state, { type: 'END_HAND', score });
    this.emit('HAND_COMPLETE', { score, declarerTricks: this.state.declarerTricks });
  }

  private emit(type: string, data?: unknown): void {
    this.config.onEvent({
      type: type as any,
      state: this.state,
      data,
    });
  }
}

// ===== Helper =====

function partnerOf(position: Position): Position {
  const idx = POSITIONS.indexOf(position);
  return POSITIONS[(idx + 2) % 4];
}

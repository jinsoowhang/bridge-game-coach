import type {
  BridgeState,
  Position,
  Card,
  Bid,
  Contract,
  Vulnerability,
  Trick,
} from './types.js';
import { POSITIONS } from './types.js';
import { cardEquals } from './card.js';
import { createTrick, addCardToTrick } from './trick.js';

// ===== Action Types =====

export type GameAction =
  | { type: 'DEAL'; hands: Record<Position, Card[]>; dealer: Position; vulnerability: Vulnerability }
  | { type: 'BID'; position: Position; bid: Bid }
  | { type: 'START_PLAY'; contract: Contract; dummy: Position }
  | { type: 'PLAY_CARD'; position: Position; card: Card }
  | { type: 'COMPLETE_TRICK'; winner: Position }
  | { type: 'END_HAND'; score: number };

// ===== Helpers =====

/** Returns the next position clockwise: N → E → S → W → N */
export function nextPosition(position: Position): Position {
  const idx = POSITIONS.indexOf(position);
  return POSITIONS[(idx + 1) % 4];
}

/** Returns the partnership for a given position. */
export function getPartnership(position: Position): 'NS' | 'EW' {
  return position === 'North' || position === 'South' ? 'NS' : 'EW';
}

// ===== Initial State =====

export function createInitialState(): BridgeState {
  return {
    phase: 'bidding',
    hands: {
      North: [],
      East: [],
      South: [],
      West: [],
    },
    currentPlayer: 'North',
    dealer: 'North',
    vulnerability: 'none',
    auction: [],
    contract: null,
    dummy: null,
    tricks: [],
    currentTrick: null,
    declarerTricks: 0,
    defenseTricks: 0,
    score: null,
  };
}

// ===== Reducer =====

export function applyAction(state: BridgeState, action: GameAction): BridgeState {
  switch (action.type) {
    case 'DEAL': {
      return {
        ...state,
        phase: 'bidding',
        hands: {
          North: [...action.hands.North],
          East: [...action.hands.East],
          South: [...action.hands.South],
          West: [...action.hands.West],
        },
        dealer: action.dealer,
        vulnerability: action.vulnerability,
        currentPlayer: action.dealer,
        auction: [],
        contract: null,
        dummy: null,
        tricks: [],
        currentTrick: null,
        declarerTricks: 0,
        defenseTricks: 0,
        score: null,
      };
    }

    case 'BID': {
      return {
        ...state,
        auction: [...state.auction, action.bid],
        currentPlayer: nextPosition(action.position),
      };
    }

    case 'START_PLAY': {
      // Opening leader is left of declarer (next clockwise from declarer)
      const openingLeader = nextPosition(action.contract.declarer);
      return {
        ...state,
        phase: 'playing',
        contract: action.contract,
        dummy: action.dummy,
        currentPlayer: openingLeader,
      };
    }

    case 'PLAY_CARD': {
      // Remove card from player's hand
      const newHand = state.hands[action.position].filter(
        c => !cardEquals(c, action.card),
      );
      const newHands = {
        ...state.hands,
        [action.position]: newHand,
      };

      // Create or add to current trick
      let newTrick: Trick;
      if (state.currentTrick === null) {
        newTrick = createTrick(action.position);
        newTrick = addCardToTrick(newTrick, action.position, action.card);
      } else {
        newTrick = addCardToTrick(state.currentTrick, action.position, action.card);
      }

      return {
        ...state,
        hands: newHands,
        currentTrick: newTrick,
        currentPlayer: nextPosition(action.position),
      };
    }

    case 'COMPLETE_TRICK': {
      const completedTrick: Trick = {
        ...state.currentTrick!,
        winner: action.winner,
      };
      const newTricks = [...state.tricks, completedTrick];

      // Determine if winner is declarer's partnership
      const declarerPartnership = state.contract
        ? getPartnership(state.contract.declarer)
        : null;
      const winnerPartnership = getPartnership(action.winner);

      const isDeclarer = declarerPartnership === winnerPartnership;

      return {
        ...state,
        tricks: newTricks,
        currentTrick: null,
        declarerTricks: state.declarerTricks + (isDeclarer ? 1 : 0),
        defenseTricks: state.defenseTricks + (isDeclarer ? 0 : 1),
        currentPlayer: action.winner,
      };
    }

    case 'END_HAND': {
      return {
        ...state,
        phase: 'complete',
        score: action.score,
      };
    }
  }
}

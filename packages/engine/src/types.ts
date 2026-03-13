// ===== Core enums and constants =====

export const POSITIONS = ['North', 'East', 'South', 'West'] as const;
export type Position = (typeof POSITIONS)[number];

export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export type Rank = (typeof RANKS)[number];

export const BID_SUITS = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'] as const;
export type BidSuit = (typeof BID_SUITS)[number];

export const BID_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;
export type BidLevel = (typeof BID_LEVELS)[number];

// ===== Card =====

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

// ===== Vulnerability =====

export type Vulnerability = 'none' | 'ns' | 'ew' | 'both';

// ===== Bidding =====

export interface ContractBid {
  readonly level: BidLevel;
  readonly suit: BidSuit;
}

export interface PassBid {
  readonly type: 'pass';
}

export interface DoubleBid {
  readonly type: 'double';
}

export interface RedoubleBid {
  readonly type: 'redouble';
}

export type Bid = ContractBid | PassBid | DoubleBid | RedoubleBid;

// ===== Contract =====

export interface Contract {
  readonly level: BidLevel;
  readonly suit: BidSuit;
  readonly declarer: Position;
  readonly doubled: boolean;
  readonly redoubled: boolean;
}

// ===== Trick =====

export interface Trick {
  readonly cards: Map<Position, Card>;
  readonly leader: Position;
  readonly winner?: Position;
}

// ===== Hand Analysis =====

export interface HandAnalysis {
  readonly hcp: number;
  readonly distributionPoints: number;
  readonly totalPoints: number;
  readonly shape: [number, number, number, number]; // spades, hearts, diamonds, clubs
  readonly isBalanced: boolean;
  readonly longestSuit: Suit;
  readonly longestLength: number;
}

// ===== Game Phase =====

export type BridgePhase = 'bidding' | 'playing' | 'scoring' | 'complete';

// ===== Game State =====

export interface BridgeState {
  readonly phase: BridgePhase;
  readonly hands: Record<Position, Card[]>;
  readonly currentPlayer: Position;
  readonly dealer: Position;
  readonly vulnerability: Vulnerability;
  readonly auction: Bid[];
  readonly contract: Contract | null;
  readonly dummy: Position | null;
  readonly tricks: Trick[];
  readonly currentTrick: Trick | null;
  readonly declarerTricks: number;
  readonly defenseTricks: number;
  readonly score: number | null;
}

// ===== Events =====

export type BridgeEventType =
  | 'HAND_DEALT'
  | 'BID_MADE'
  | 'AUCTION_COMPLETE'
  | 'CARD_PLAYED'
  | 'TRICK_COMPLETE'
  | 'DUMMY_REVEALED'
  | 'HAND_COMPLETE'
  | 'AWAITING_BID'
  | 'AWAITING_PLAY';

export interface BridgeEvent {
  readonly type: BridgeEventType;
  readonly state: BridgeState;
  readonly data?: unknown;
}

export type BridgeEventHandler = (event: BridgeEvent) => void;

// ===== Providers (async hooks for human/AI input) =====

export type BidProvider = (
  position: Position,
  validBids: Bid[],
  state: BridgeState,
) => Promise<Bid>;

export type PlayProvider = (
  position: Position,
  validCards: Card[],
  state: BridgeState,
) => Promise<Card>;

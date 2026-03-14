import { create } from 'zustand';
import {
  GameLoop,
  type BridgeState,
  type BridgeEvent,
  type Bid,
  type Card,
  type Position,
  type BiddingHint,
  type PlayHint,
  selectBid,
  selectPlay,
  getBiddingHint,
  getPlayHint,
} from '@bridge-coach/engine';
import { useSettingsStore } from './useSettingsStore';

type Phase = 'idle' | 'bidding' | 'playing' | 'scoring' | 'complete';

interface PendingAction {
  type: 'bid' | 'play';
  validChoices: Bid[] | Card[];
}

interface HandResult {
  contract: string | null;
  result: string;
  score: number;
}

interface GameState {
  gameState: BridgeState | null;
  phase: Phase;
  pendingAction: PendingAction | null;
  coachingHint: BiddingHint | PlayHint | null;
  handHistory: HandResult[];
  isDummyTurn: boolean;

  startHand: () => void;
  resolve: (choice: Bid | Card) => void;
  requestHint: () => void;
}

let pendingResolver: ((value: Bid | Card) => void) | null = null;

export const useGameStore = create<GameState>()((set, get) => ({
  gameState: null,
  phase: 'idle',
  pendingAction: null,
  coachingHint: null,
  handHistory: [],
  isDummyTurn: false,

  startHand: () => {
    set({ phase: 'bidding', pendingAction: null, coachingHint: null, isDummyTurn: false });

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const humanProvider = async (
      _position: Position,
      validChoices: Bid[] | Card[],
      state: BridgeState,
      type: 'bid' | 'play',
    ): Promise<Bid | Card> => {
      const isDummy = state.dummy !== null && state.currentPlayer === state.dummy;
      const settingsStore = useSettingsStore.getState();

      let hint: BiddingHint | PlayHint | null = null;
      if (settingsStore.coachingMode === 'always-on') {
        if (type === 'bid') {
          hint = getBiddingHint('South', state.hands['South'], state.auction, state.dealer);
        } else {
          const pos = isDummy ? 'North' : 'South';
          hint = getPlayHint(pos, state.hands[pos], validChoices as Card[], state);
        }
      }

      set({
        gameState: state,
        pendingAction: { type, validChoices },
        coachingHint: hint,
        isDummyTurn: isDummy,
      });

      return new Promise<Bid | Card>((resolve) => {
        pendingResolver = resolve;
      });
    };

    const getBid = async (position: Position, validBids: Bid[], state: BridgeState): Promise<Bid> => {
      if (position === 'South') {
        return humanProvider(position, validBids, state, 'bid') as Promise<Bid>;
      }
      await delay(400);
      const hand = state.hands[position];
      return selectBid(position, hand, state.auction, state.dealer);
    };

    const getPlay = async (position: Position, validCards: Card[], state: BridgeState): Promise<Card> => {
      // Engine calls getPlay(declarer) for dummy's turns — position will be South
      if (position === 'South') {
        return humanProvider(position, validCards, state, 'play') as Promise<Card>;
      }
      await delay(300);
      return selectPlay(position, state.hands[position], validCards, state);
    };

    const onEvent = (event: BridgeEvent) => {
      const phaseMap: Record<string, Phase> = {
        HAND_DEALT: 'bidding',
        BID_MADE: 'bidding',
        AUCTION_COMPLETE: 'playing',
        DUMMY_REVEALED: 'playing',
        CARD_PLAYED: 'playing',
        TRICK_COMPLETE: 'playing',
        HAND_COMPLETE: 'complete',
      };
      const phase = phaseMap[event.type] ?? get().phase;

      // 800ms pause on trick complete so user can see all 4 cards
      if (event.type === 'TRICK_COMPLETE') {
        set({ gameState: event.state, phase });
        // The delay before the next trick is handled by the AI delay in getPlay
      } else {
        set({ gameState: event.state, phase });
      }
    };

    const dealer: Position = 'North';
    const vulnerability = 'none' as const;

    const gameLoop = new GameLoop({ dealer, vulnerability, onEvent, getBid, getPlay });

    gameLoop.playHand().then((finalState) => {
      const contract = finalState.contract;
      const score = finalState.score ?? 0;
      let result: string;
      let contractStr: string | null = null;

      if (!contract) {
        result = 'All passed — no contract';
      } else {
        const needed = 6 + contract.level;
        const made = finalState.declarerTricks;
        contractStr = `${contract.level}${contract.suit === 'notrump' ? 'NT' : contract.suit[0].toUpperCase()}`;
        if (made >= needed) {
          const over = made - needed;
          result = over > 0 ? `Made ${contract.level} +${over}` : `Made ${contract.level}`;
        } else {
          result = `Down ${needed - made}`;
        }
      }

      const settings = useSettingsStore.getState();
      settings.incrementHandsPlayed();

      set((s) => ({
        phase: 'complete',
        pendingAction: null,
        coachingHint: null,
        handHistory: [...s.handHistory, { contract: contractStr, result, score }],
      }));
    });
  },

  resolve: (choice) => {
    if (pendingResolver) {
      const resolver = pendingResolver;
      pendingResolver = null;
      set({ pendingAction: null, coachingHint: null });
      resolver(choice);
    }
  },

  requestHint: () => {
    const { gameState, pendingAction } = get();
    if (!gameState || !pendingAction) return;

    if (pendingAction.type === 'bid') {
      const hint = getBiddingHint('South', gameState.hands['South'], gameState.auction, gameState.dealer);
      set({ coachingHint: hint });
    } else {
      const isDummy = gameState.dummy !== null && gameState.currentPlayer === gameState.dummy;
      const pos = isDummy ? 'North' : 'South';
      const hint = getPlayHint(pos, gameState.hands[pos], pendingAction.validChoices as Card[], gameState);
      set({ coachingHint: hint });
    }
  },
}));

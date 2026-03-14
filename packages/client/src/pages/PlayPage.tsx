import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bid, Card } from '@bridge-coach/engine';
import { useGameStore } from '../stores/useGameStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { GameHeader } from '../components/GameHeader';
import { BridgeTable } from '../components/BridgeTable';
import { PlayerHand } from '../components/PlayerHand';
import { BiddingBox } from '../components/BiddingBox';
import { BiddingHistory } from '../components/BiddingHistory';
import { CoachingBubble } from '../components/CoachingBubble';
import { HandSummaryModal } from '../components/HandSummaryModal';

export function PlayPage() {
  const navigate = useNavigate();
  const { gameState, phase, pendingAction, coachingHint, handHistory, isDummyTurn, startHand, resolve, requestHint } =
    useGameStore();
  const { coachingMode, handsPlayed } = useSettingsStore();

  useEffect(() => {
    if (phase === 'idle') {
      startHand();
    }
  }, []);

  if (!gameState) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-[var(--gold)]">
        Dealing...
      </div>
    );
  }

  const showBiddingBox = phase === 'bidding' && pendingAction?.type === 'bid';
  const showPlayerHand = phase === 'playing' && pendingAction?.type === 'play' && !isDummyTurn;
  const showComplete = phase === 'complete';

  const hintExplanation = coachingHint?.explanation ?? '';

  const highlightedCard =
    coachingHint && pendingAction?.type === 'play' && 'suggestion' in coachingHint
      ? (coachingHint.suggestion as Card)
      : null;

  const highlightedBid =
    coachingHint && pendingAction?.type === 'bid' && 'suggestion' in coachingHint
      ? (coachingHint.suggestion as Bid)
      : null;

  const lastResult = handHistory[handHistory.length - 1];

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--felt-dark)]">
      <GameHeader
        contract={gameState.contract}
        vulnerability={gameState.vulnerability}
        phase={phase}
        dealer={gameState.dealer}
      />

      <div className="flex-1 flex flex-col">
        {/* Bidding history (during auction) */}
        {phase === 'bidding' && gameState.auction.length > 0 && (
          <BiddingHistory auction={gameState.auction} dealer={gameState.dealer} />
        )}

        {/* Bridge Table */}
        <div className="flex-1 flex items-center">
          <div className="w-full">
            <BridgeTable state={gameState} />
          </div>
        </div>

        {/* Coaching Bubble */}
        {pendingAction && (
          <CoachingBubble
            explanation={hintExplanation}
            onRequestHint={requestHint}
            mode={coachingMode}
          />
        )}

        {/* Bottom Zone: BiddingBox or PlayerHand */}
        {showBiddingBox && (
          <BiddingBox
            validBids={pendingAction!.validChoices as Bid[]}
            onBid={(bid) => resolve(bid)}
            highlightedBid={highlightedBid}
          />
        )}

        {showPlayerHand && (
          <PlayerHand
            cards={gameState.hands['South']}
            validCards={pendingAction!.validChoices as Card[]}
            onCardClick={(card) => resolve(card)}
            highlightedCard={highlightedCard}
          />
        )}

        {/* Show hand even when not interactive (AI thinking, etc.) */}
        {phase === 'playing' && !pendingAction && (
          <PlayerHand cards={gameState.hands['South']} />
        )}
      </div>

      {/* Hand Summary Modal */}
      {showComplete && lastResult && (
        <HandSummaryModal
          contract={lastResult.contract}
          result={lastResult.result}
          score={lastResult.score}
          onNextHand={startHand}
          onGoHome={() => navigate('/')}
        />
      )}
    </div>
  );
}

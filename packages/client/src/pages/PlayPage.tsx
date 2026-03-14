import { useEffect, useState } from 'react';
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

  const [showCoachingPrompt, setShowCoachingPrompt] = useState(false);

  useEffect(() => {
    if (phase === 'idle') {
      startHand();
    }
  }, []);

  useEffect(() => {
    if (handsPlayed === 5 && coachingMode === 'always-on' && phase === 'complete') {
      setShowCoachingPrompt(true);
    }
  }, [handsPlayed, phase]);

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

      {showCoachingPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--felt-dark)] border-2 border-[var(--gold)] rounded-xl p-6 max-w-sm w-full text-center">
            <h2 className="text-lg font-serif text-[var(--gold)] mb-2">Nice progress!</h2>
            <p className="text-sm text-[var(--gold-light)] mb-4">
              You've played 5 hands! Want to try without automatic hints? You can always tap "Hint" when you need help.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  useSettingsStore.getState().setCoachingMode('hint-button');
                  setShowCoachingPrompt(false);
                }}
                className="bg-[var(--gold)] text-[var(--felt-dark)] font-bold py-3 rounded-lg cursor-pointer"
              >
                Switch to Hint Button
              </button>
              <button
                onClick={() => setShowCoachingPrompt(false)}
                className="text-[var(--gold)] py-2 text-sm cursor-pointer hover:underline"
              >
                Keep Automatic Hints
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

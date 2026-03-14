import type { BridgeState, Card } from '@bridge-coach/engine';
import { PlayerPosition } from './PlayerPosition';
import { TrickArea } from './TrickArea';
import { DummyHand } from './DummyHand';
import { useGameStore } from '../stores/useGameStore';

interface BridgeTableProps {
  state: BridgeState;
}

export function BridgeTable({ state }: BridgeTableProps) {
  const { pendingAction, isDummyTurn, coachingHint, resolve } = useGameStore();
  const showDummy = state.phase === 'playing' && state.dummy !== null;
  const dummyCards = showDummy ? state.hands[state.dummy!] : [];

  const validDummyCards = isDummyTurn && pendingAction?.type === 'play'
    ? (pendingAction.validChoices as Card[])
    : undefined;

  const highlightedDummyCard = isDummyTurn && coachingHint && 'suggestion' in coachingHint
    ? (coachingHint.suggestion as Card)
    : null;

  return (
    <div
      className="mx-2 rounded-xl border-2 border-[var(--felt-border)] p-3 relative"
      style={{ background: 'radial-gradient(ellipse at center, var(--felt-light) 0%, var(--felt-dark) 100%)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.4)' }}
    >
      {/* North (Dummy) */}
      <div className="text-center mb-2">
        <PlayerPosition
          position="North"
          trickCount={state.declarerTricks}
          isCurrentPlayer={state.currentPlayer === 'North'}
          cardsRemaining={state.hands['North'].length}
        />
        {showDummy && (
          <div className="mt-1">
            <DummyHand
              cards={dummyCards}
              validCards={validDummyCards}
              onCardClick={(card) => resolve(card)}
              highlightedCard={highlightedDummyCard}
              interactive={isDummyTurn}
            />
          </div>
        )}
      </div>

      {/* West / TrickArea / East */}
      <div className="flex items-center justify-between my-4">
        <PlayerPosition
          position="West"
          trickCount={state.defenseTricks}
          isCurrentPlayer={state.currentPlayer === 'West'}
          cardsRemaining={state.hands['West'].length}
        />

        <TrickArea
          currentTrick={state.currentTrick}
          waitingFor={state.phase === 'playing' ? state.currentPlayer : null}
        />

        <PlayerPosition
          position="East"
          trickCount={state.defenseTricks}
          isCurrentPlayer={state.currentPlayer === 'East'}
          cardsRemaining={state.hands['East'].length}
        />
      </div>

      {/* South label */}
      <div className="text-center mt-2">
        <PlayerPosition
          position="South"
          trickCount={state.declarerTricks}
          isCurrentPlayer={state.currentPlayer === 'South'}
          cardsRemaining={state.hands['South'].length}
        />
      </div>
    </div>
  );
}

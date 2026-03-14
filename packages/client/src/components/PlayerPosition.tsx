import type { Position } from '@bridge-coach/engine';
import { CardBack } from './CardComponent';

interface PlayerPositionProps {
  position: Position;
  trickCount: number;
  isCurrentPlayer: boolean;
  cardsRemaining: number;
}

export function PlayerPosition({ position, trickCount, isCurrentPlayer, cardsRemaining }: PlayerPositionProps) {
  const isHuman = position === 'South';
  const label = isHuman ? `${position} (You)` : position;

  return (
    <div className="text-center">
      <div className={`text-xs font-serif ${isCurrentPlayer ? 'text-[var(--gold)]' : 'text-[var(--gold)]/60'}`}>
        {label}
      </div>
      <div className="text-xs text-[var(--felt-border)] mt-0.5">
        {trickCount} {trickCount === 1 ? 'trick' : 'tricks'}
      </div>
      {!isHuman && position !== 'North' && (
        <div className="flex gap-0.5 justify-center mt-1">
          {Array.from({ length: Math.min(cardsRemaining, 3) }).map((_, i) => (
            <CardBack key={i} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

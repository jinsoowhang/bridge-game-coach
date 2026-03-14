import type { Trick, Position } from '@bridge-coach/engine';
import { CardComponent } from './CardComponent';

interface TrickAreaProps {
  currentTrick: Trick | null;
  waitingFor: Position | null;
}

const positionStyles: Record<Position, string> = {
  North: 'top-0 left-1/2 -translate-x-1/2',
  South: 'bottom-0 left-1/2 -translate-x-1/2',
  West: 'top-1/2 left-0 -translate-y-1/2',
  East: 'top-1/2 right-0 -translate-y-1/2',
};

export function TrickArea({ currentTrick, waitingFor }: TrickAreaProps) {
  return (
    <div className="relative w-32 h-28">
      {(['North', 'South', 'East', 'West'] as Position[]).map((pos) => {
        const card = currentTrick?.cards.get(pos);
        return (
          <div key={pos} className={`absolute ${positionStyles[pos]}`}>
            {card ? (
              <CardComponent card={card} size="sm" />
            ) : pos === waitingFor ? (
              <div className="w-7 h-10 border border-dashed border-[#4aaa60] rounded-sm flex items-center justify-center text-xs text-[#4aaa60]">
                ?
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

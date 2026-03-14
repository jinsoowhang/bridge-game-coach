import type { Card } from '@bridge-coach/engine';
import { compareBySuit, cardEquals } from '@bridge-coach/engine';
import { CardComponent } from './CardComponent';

interface PlayerHandProps {
  cards: Card[];
  validCards?: Card[];
  onCardClick?: (card: Card) => void;
  highlightedCard?: Card | null;
}

export function PlayerHand({ cards, validCards, onCardClick, highlightedCard }: PlayerHandProps) {
  const sorted = [...cards].sort(compareBySuit);

  return (
    <div className="bg-black/25 border-t border-[var(--felt-border)] px-2 py-3">
      <div className="flex justify-center gap-1 flex-wrap">
        {sorted.map((card, i) => {
          const isValid = validCards?.some((c) => cardEquals(c, card)) ?? true;
          const isHighlighted = highlightedCard ? cardEquals(card, highlightedCard) : false;

          return (
            <CardComponent
              key={i}
              card={card}
              size="lg"
              disabled={!isValid}
              highlighted={isHighlighted}
              onClick={isValid && onCardClick ? () => onCardClick(card) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

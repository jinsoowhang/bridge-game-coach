import type { Card } from '@bridge-coach/engine';
import { compareBySuit, cardEquals } from '@bridge-coach/engine';
import { CardComponent } from './CardComponent';

interface DummyHandProps {
  cards: Card[];
  validCards?: Card[];
  onCardClick?: (card: Card) => void;
  highlightedCard?: Card | null;
  interactive: boolean;
}

export function DummyHand({ cards, validCards, onCardClick, highlightedCard, interactive }: DummyHandProps) {
  const sorted = [...cards].sort(compareBySuit);

  return (
    <div className="flex justify-center gap-0.5 flex-wrap max-w-52">
      {sorted.map((card, i) => {
        const isValid = validCards?.some((c) => cardEquals(c, card)) ?? false;
        const isHighlighted = highlightedCard ? cardEquals(card, highlightedCard) : false;

        return (
          <CardComponent
            key={i}
            card={card}
            size="sm"
            disabled={!interactive || !isValid}
            highlighted={isHighlighted}
            onClick={interactive && isValid && onCardClick ? () => onCardClick(card) : undefined}
          />
        );
      })}
    </div>
  );
}

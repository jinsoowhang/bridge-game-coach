import type { Card } from '@bridge-coach/engine';
import { SUIT_SYMBOLS } from '@bridge-coach/engine';

interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-7 h-10 text-xs',
  md: 'w-9 h-13 text-sm',
  lg: 'w-11 h-16 text-base',
};

export function CardComponent({ card, onClick, disabled, highlighted, size = 'md' }: CardComponentProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const pipColor = isRed ? 'text-[var(--pip-red)]' : 'text-[var(--pip-black)]';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        bg-[var(--card-face)] rounded-sm border border-[#ddd]
        flex items-center justify-center font-serif
        shadow-md transition-all select-none
        ${pipColor}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
        ${highlighted ? 'ring-2 ring-[var(--gold)] bg-[#e8dcc8]' : ''}
      `}
    >
      {card.rank}{SUIT_SYMBOLS[card.suit]}
    </button>
  );
}

export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        bg-[var(--felt-border)] border border-[#3a7d4a] rounded-sm
      `}
    />
  );
}

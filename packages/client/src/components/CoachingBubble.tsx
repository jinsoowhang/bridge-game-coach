interface CoachingBubbleProps {
  explanation: string;
  onRequestHint?: () => void;
  mode: 'always-on' | 'hint-button';
}

export function CoachingBubble({ explanation, onRequestHint, mode }: CoachingBubbleProps) {
  if (mode === 'hint-button' && !explanation) {
    return (
      <div className="mx-2 my-1">
        <button
          onClick={onRequestHint}
          className="w-full rounded-lg border border-[var(--gold)] bg-[var(--coaching-bg)] px-3 py-2 text-sm text-[var(--gold)] cursor-pointer hover:bg-[var(--gold)]/20 transition-colors"
        >
          Hint
        </button>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className="mx-2 my-1 rounded-lg border border-[var(--gold)] bg-[var(--coaching-bg)] px-3 py-2 text-sm text-[var(--gold-light)]">
      <span className="font-bold">Coach:</span> {explanation}
    </div>
  );
}

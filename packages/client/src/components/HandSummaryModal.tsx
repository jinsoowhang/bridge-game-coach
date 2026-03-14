interface HandSummaryModalProps {
  contract: string | null;
  result: string;
  score: number;
  onNextHand: () => void;
  onGoHome: () => void;
}

export function HandSummaryModal({ contract, result, score, onNextHand, onGoHome }: HandSummaryModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--felt-dark)] border-2 border-[var(--gold)] rounded-xl p-6 max-w-sm w-full text-center">
        <h2 className="text-xl font-serif text-[var(--gold)] mb-2">Hand Complete</h2>

        {contract ? (
          <>
            <div className="text-lg text-[var(--gold-light)] mb-1">{contract}</div>
            <div className="text-2xl font-bold text-[var(--gold-light)] mb-1">{result}</div>
          </>
        ) : (
          <div className="text-lg text-[var(--gold-light)] mb-1">All passed — no contract</div>
        )}

        <div className={`text-xl mb-4 ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {score >= 0 ? '+' : ''}{score}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onNextHand}
            className="bg-[var(--gold)] text-[var(--felt-dark)] font-bold py-3 rounded-lg text-base cursor-pointer hover:bg-[var(--gold)]/90 transition-colors"
          >
            Next Hand
          </button>
          <button
            onClick={onGoHome}
            className="text-[var(--gold)] py-2 text-sm cursor-pointer hover:underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

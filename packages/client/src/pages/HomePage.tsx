import { Link } from 'react-router-dom';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useLessonStore } from '../stores/useLessonStore';

export function HomePage() {
  const { handsPlayed } = useSettingsStore();
  const { completedLessons } = useLessonStore();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[var(--felt-dark)]">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-serif text-[var(--gold)] mb-2">Bridge Coach</h1>
        <p className="text-sm text-[var(--gold)]/60">
          <span className="text-[var(--pip-red)]">&hearts;</span>{' '}
          <span className="text-[var(--pip-black)]">&spades;</span>{' '}
          <span className="text-[var(--pip-red)]">&diams;</span>{' '}
          <span className="text-[var(--pip-black)]">&clubs;</span>
        </p>
      </div>

      {/* Path Cards */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          to="/lessons"
          className="block bg-[var(--felt-border)] border-2 border-[var(--gold)]/30 rounded-xl p-6 hover:border-[var(--gold)] transition-colors no-underline"
        >
          <h2 className="text-xl font-serif text-[var(--gold)] mb-1">Learn Bridge</h2>
          <p className="text-sm text-[var(--gold-light)]/70">
            {completedLessons.length > 0
              ? `${completedLessons.length}/5 lessons complete`
              : '5 beginner lessons'}
          </p>
        </Link>

        <Link
          to="/play"
          className="block bg-[var(--felt-border)] border-2 border-[var(--gold)]/30 rounded-xl p-6 hover:border-[var(--gold)] transition-colors no-underline"
        >
          <h2 className="text-xl font-serif text-[var(--gold)] mb-1">Play Bridge</h2>
          <p className="text-sm text-[var(--gold-light)]/70">
            {handsPlayed > 0
              ? `${handsPlayed} hands played`
              : 'Coached game with AI partners'}
          </p>
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { lessons } from '../lessons/lessonData';
import { useLessonStore } from '../stores/useLessonStore';

export function LessonsPage() {
  const { completedLessons } = useLessonStore();

  return (
    <div className="min-h-dvh bg-[var(--felt-dark)] p-4">
      <div className="max-w-sm mx-auto">
        <Link to="/" className="text-[var(--gold)] text-sm hover:underline">
          &larr; Home
        </Link>
        <h1 className="text-2xl font-serif text-[var(--gold)] mt-4 mb-6">Learn Bridge</h1>

        <div className="flex flex-col gap-3">
          {lessons.map((lesson, i) => {
            const isComplete = completedLessons.includes(lesson.id);
            return (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="block bg-[var(--felt-border)] border border-[var(--gold)]/20 rounded-xl p-4 hover:border-[var(--gold)] transition-colors no-underline"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[var(--gold)]/60 mb-1">Lesson {i + 1}</div>
                    <h2 className="text-lg font-serif text-[var(--gold)]">{lesson.title}</h2>
                    <p className="text-sm text-[var(--gold-light)]/70">{lesson.description}</p>
                  </div>
                  {isComplete && (
                    <span className="text-green-400 text-xl">&#10003;</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

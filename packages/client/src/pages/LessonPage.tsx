import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { lessons } from '../lessons/lessonData';
import { useLessonStore } from '../stores/useLessonStore';

export function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { completeLesson, setExerciseProgress, currentExercise } = useLessonStore();

  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) {
    return (
      <div className="min-h-dvh bg-[var(--felt-dark)] flex items-center justify-center text-[var(--gold)]">
        Lesson not found
      </div>
    );
  }

  const savedProgress = currentExercise[lesson.id] ?? 0;
  const [currentBlock, setCurrentBlock] = useState(savedProgress);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const block = lesson.blocks[currentBlock];
  const totalBlocks = lesson.blocks.length;
  const isLast = currentBlock === totalBlocks - 1;

  const handleAnswer = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);

    if (isLast) {
      completeLesson(lesson.id);
      navigate('/lessons');
    } else {
      const next = currentBlock + 1;
      setCurrentBlock(next);
      setExerciseProgress(lesson.id, next);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--felt-dark)] p-4">
      <div className="max-w-sm mx-auto">
        <Link to="/lessons" className="text-[var(--gold)] text-sm hover:underline">
          &larr; Lessons
        </Link>

        <h1 className="text-xl font-serif text-[var(--gold)] mt-4 mb-1">{lesson.title}</h1>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {lesson.blocks.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < currentBlock ? 'bg-[var(--gold)]' : i === currentBlock ? 'bg-[var(--gold)]/60' : 'bg-[var(--felt-border)]'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        {block.type === 'text' && (
          <div className="mb-6">
            <p className="text-[var(--gold-light)] leading-relaxed">{block.text}</p>
            <button
              onClick={handleNext}
              className="mt-6 w-full bg-[var(--gold)] text-[var(--felt-dark)] font-bold py-3 rounded-lg cursor-pointer hover:bg-[var(--gold)]/90 transition-colors"
            >
              {isLast ? 'Complete Lesson' : 'Next'}
            </button>
          </div>
        )}

        {block.type === 'exercise' && block.exercise && (
          <div className="mb-6">
            <p className="text-[var(--gold-light)] font-bold mb-4">{block.exercise.question}</p>

            <div className="flex flex-col gap-2">
              {block.exercise.options.map((option, i) => {
                let btnClass = 'bg-[var(--felt-border)] text-[var(--gold-light)] border border-[var(--gold)]/20';
                if (showFeedback) {
                  if (i === block.exercise!.correctIndex) {
                    btnClass = 'bg-green-900 text-green-200 border border-green-500';
                  } else if (i === selectedAnswer) {
                    btnClass = 'bg-red-900 text-red-200 border border-red-500';
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={showFeedback}
                    className={`
                      ${btnClass}
                      rounded-lg p-3 text-left text-sm transition-colors
                      ${!showFeedback ? 'cursor-pointer hover:border-[var(--gold)]' : ''}
                    `}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <div className="mt-4">
                <p className="text-sm text-[var(--gold-light)]/80 mb-4">{block.exercise.explanation}</p>
                <button
                  onClick={handleNext}
                  className="w-full bg-[var(--gold)] text-[var(--felt-dark)] font-bold py-3 rounded-lg cursor-pointer hover:bg-[var(--gold)]/90 transition-colors"
                >
                  {isLast ? 'Complete Lesson' : 'Next'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

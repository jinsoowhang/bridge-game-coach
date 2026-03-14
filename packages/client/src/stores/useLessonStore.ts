import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LessonState {
  completedLessons: string[];
  currentExercise: Record<string, number>;
  completeLesson: (id: string) => void;
  setExerciseProgress: (lessonId: string, index: number) => void;
  resetLesson: (id: string) => void;
}

export const useLessonStore = create<LessonState>()(
  persist(
    (set) => ({
      completedLessons: [],
      currentExercise: {},
      completeLesson: (id) =>
        set((s) => ({
          completedLessons: s.completedLessons.includes(id)
            ? s.completedLessons
            : [...s.completedLessons, id],
        })),
      setExerciseProgress: (lessonId, index) =>
        set((s) => ({
          currentExercise: { ...s.currentExercise, [lessonId]: index },
        })),
      resetLesson: (id) =>
        set((s) => ({
          completedLessons: s.completedLessons.filter((l) => l !== id),
          currentExercise: { ...s.currentExercise, [id]: 0 },
        })),
    }),
    { name: 'bridge-coach-lessons' },
  ),
);

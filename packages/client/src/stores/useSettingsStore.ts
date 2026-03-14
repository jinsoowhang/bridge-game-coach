import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  coachingMode: 'always-on' | 'hint-button';
  handsPlayed: number;
  setCoachingMode: (mode: 'always-on' | 'hint-button') => void;
  incrementHandsPlayed: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      coachingMode: 'always-on',
      handsPlayed: 0,
      setCoachingMode: (mode) => set({ coachingMode: mode }),
      incrementHandsPlayed: () =>
        set((s) => ({ handsPlayed: s.handsPlayed + 1 })),
    }),
    { name: 'bridge-coach-settings' },
  ),
);

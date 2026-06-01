import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChatMessage,
  DayLog,
  ExerciseEntry,
  FoodEntry,
  Goal,
  Profile,
  Settings,
} from '../types';
import { todayKey } from '../lib/date';

function uid(): string {
  return crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function emptyDay(date: string): DayLog {
  return { date, foods: [], exercises: [] };
}

interface State {
  profile: Profile;
  goal: Goal;
  settings: Settings;
  days: Record<string, DayLog>;
  chat: ChatMessage[];
  selectedDate: string;
  /** Vom "Vorschläge"-Button gesetzt, vom Chat beim Öffnen abgearbeitet. */
  pendingPrompt: string | null;

  setProfile: (p: Partial<Profile>) => void;
  setGoal: (g: Partial<Goal>) => void;
  setSettings: (s: Partial<Settings>) => void;
  setSelectedDate: (d: string) => void;
  setPendingPrompt: (p: string | null) => void;

  getDay: (date?: string) => DayLog;
  addFood: (date: string, food: Omit<FoodEntry, 'id' | 'time'>) => void;
  removeFood: (date: string, id: string) => void;
  addExercise: (date: string, ex: Omit<ExerciseEntry, 'id' | 'time'>) => void;
  removeExercise: (date: string, id: string) => void;

  pushChat: (m: ChatMessage) => void;
  clearChat: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: {
        sex: 'male',
        age: 30,
        height: 180,
        weight: 80,
        activity: 'light',
      },
      goal: {
        mode: 'maintain',
        adjustment: 0,
        proteinPct: 30,
        carbsPct: 40,
        fatPct: 30,
        addExerciseToBudget: true,
      },
      settings: {
        apiKey: '',
        model: 'claude-sonnet-4-6',
      },
      days: {},
      chat: [],
      selectedDate: todayKey(),
      pendingPrompt: null,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setGoal: (g) => set((s) => ({ goal: { ...s.goal, ...g } })),
      setSettings: (st) => set((s) => ({ settings: { ...s.settings, ...st } })),
      setSelectedDate: (d) => set({ selectedDate: d }),
      setPendingPrompt: (p) => set({ pendingPrompt: p }),

      getDay: (date) => {
        const d = date ?? get().selectedDate;
        return get().days[d] ?? emptyDay(d);
      },

      addFood: (date, food) =>
        set((s) => {
          const day = s.days[date] ?? emptyDay(date);
          const entry: FoodEntry = { ...food, id: uid(), time: new Date().toISOString() };
          return { days: { ...s.days, [date]: { ...day, foods: [...day.foods, entry] } } };
        }),

      removeFood: (date, id) =>
        set((s) => {
          const day = s.days[date] ?? emptyDay(date);
          return {
            days: { ...s.days, [date]: { ...day, foods: day.foods.filter((f) => f.id !== id) } },
          };
        }),

      addExercise: (date, ex) =>
        set((s) => {
          const day = s.days[date] ?? emptyDay(date);
          const entry: ExerciseEntry = { ...ex, id: uid(), time: new Date().toISOString() };
          return {
            days: { ...s.days, [date]: { ...day, exercises: [...day.exercises, entry] } },
          };
        }),

      removeExercise: (date, id) =>
        set((s) => {
          const day = s.days[date] ?? emptyDay(date);
          return {
            days: {
              ...s.days,
              [date]: { ...day, exercises: day.exercises.filter((e) => e.id !== id) },
            },
          };
        }),

      pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
      clearChat: () => set({ chat: [] }),
    }),
    {
      name: 'essen-store',
      version: 1,
      partialize: (s) => ({
        profile: s.profile,
        goal: s.goal,
        settings: s.settings,
        days: s.days,
        chat: s.chat,
      }),
    }
  )
);

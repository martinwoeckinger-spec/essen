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
import { MEALS } from '../types';
import type { ParsedRow } from '../lib/parse';
import { isoAt, todayKey } from '../lib/date';

function uid(): string {
  return crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function emptyDay(date: string): DayLog {
  return { date, foods: [], exercises: [] };
}

const DEFAULT_PROFILE: Profile = {
  name: '',
  sex: 'male',
  age: 30,
  height: 180,
  weight: 80,
  targetWeight: undefined,
  activity: 'light',
};

const DEFAULT_GOAL: Goal = {
  mode: 'maintain',
  adjustment: 0,
  proteinPct: 30,
  carbsPct: 40,
  fatPct: 30,
  addExerciseToBudget: true,
  dietStyle: 'omnivore',
  fiberGoal: 30,
  sugarLimit: 50,
  saltLimit: 6,
  satFatLimit: 20,
  preferences: '',
};

interface ImportResult {
  added: number;
  days: number;
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
  /** Steuert das Import-Overlay (nicht persistiert). */
  importOpen: boolean;

  setProfile: (p: Partial<Profile>) => void;
  setGoal: (g: Partial<Goal>) => void;
  setSettings: (s: Partial<Settings>) => void;
  setSelectedDate: (d: string) => void;
  setPendingPrompt: (p: string | null) => void;
  setImportOpen: (open: boolean) => void;

  getDay: (date?: string) => DayLog;
  addFood: (date: string, food: Omit<FoodEntry, 'id' | 'time'>) => void;
  removeFood: (date: string, id: string) => void;
  addExercise: (date: string, ex: Omit<ExerciseEntry, 'id' | 'time'>) => void;
  removeExercise: (date: string, id: string) => void;

  /** Strukturierten Import übernehmen (Datum/Mahlzeit werden zugeordnet). */
  importEntries: (rows: ParsedRow[], replaceDays: boolean) => ImportResult;
  /** Nur die Mahlzeiten eines Tages löschen (Sport bleibt). */
  clearDayFoods: (date: string) => void;
  /** Einen Tag komplett aus dem Archiv entfernen. */
  removeDay: (date: string) => void;

  pushChat: (m: ChatMessage) => void;
  clearChat: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      goal: DEFAULT_GOAL,
      settings: {
        apiKey: '',
        model: 'claude-sonnet-4-6',
      },
      days: {},
      chat: [],
      selectedDate: todayKey(),
      pendingPrompt: null,
      importOpen: false,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setGoal: (g) => set((s) => ({ goal: { ...s.goal, ...g } })),
      setSettings: (st) => set((s) => ({ settings: { ...s.settings, ...st } })),
      setSelectedDate: (d) => set({ selectedDate: d }),
      setPendingPrompt: (p) => set({ pendingPrompt: p }),
      setImportOpen: (open) => set({ importOpen: open }),

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

      importEntries: (rows, replaceDays) => {
        const days = { ...get().days };
        if (replaceDays) {
          for (const date of new Set(rows.map((r) => r.date))) {
            const day = days[date] ?? emptyDay(date);
            days[date] = { ...day, foods: [] };
          }
        }
        const seq: Record<string, number> = {};
        for (const r of rows) {
          const day = days[r.date] ?? emptyDay(r.date);
          const idx = (seq[r.date] = (seq[r.date] ?? 0) + 1);
          const entry: FoodEntry = {
            id: uid(),
            name: r.name,
            meal: r.meal,
            quantity: r.quantity,
            calories: Math.round(r.calories),
            protein: Math.round(r.protein),
            carbs: Math.round(r.carbs),
            sugar: Math.round(r.sugar),
            fat: Math.round(r.fat),
            saturatedFat: Math.round(r.saturatedFat),
            fiber: Math.round(r.fiber),
            salt: Math.round(r.salt * 10) / 10,
            note: r.note,
            source: 'import',
            time: isoAt(r.date, MEALS[r.meal].hour, idx),
          };
          days[r.date] = { ...day, foods: [...day.foods, entry] };
        }
        set({ days });
        return { added: rows.length, days: new Set(rows.map((r) => r.date)).size };
      },

      clearDayFoods: (date) =>
        set((s) => {
          const day = s.days[date] ?? emptyDay(date);
          return { days: { ...s.days, [date]: { ...day, foods: [] } } };
        }),

      removeDay: (date) =>
        set((s) => {
          const days = { ...s.days };
          delete days[date];
          return { days };
        }),

      pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
      clearChat: () => set({ chat: [] }),
    }),
    {
      name: 'essen-store',
      version: 2,
      partialize: (s) => ({
        profile: s.profile,
        goal: s.goal,
        settings: s.settings,
        days: s.days,
        chat: s.chat,
      }),
      // Ältere Daten (v1) auf das erweiterte Modell heben.
      migrate: (persisted: any) => {
        const s = persisted ?? {};
        s.profile = { ...DEFAULT_PROFILE, ...(s.profile ?? {}) };
        s.goal = { ...DEFAULT_GOAL, ...(s.goal ?? {}) };
        if (s.days) {
          for (const key of Object.keys(s.days)) {
            const day = s.days[key];
            day.foods = (day.foods ?? []).map((f: any) => ({
              meal: 'snack',
              sugar: 0,
              saturatedFat: 0,
              fiber: 0,
              salt: 0,
              source: 'manual',
              ...f,
            }));
          }
        }
        return s;
      },
    }
  )
);

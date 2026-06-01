export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type GoalMode = 'lose' | 'maintain' | 'gain';

export interface Profile {
  sex: Sex;
  age: number; // Jahre
  height: number; // cm
  weight: number; // kg
  activity: ActivityLevel;
}

export interface Goal {
  /** Voreinstellung, beeinflusst nur die Beschriftung. */
  mode: GoalMode;
  /** kcal/Tag auf den Erhaltungsbedarf addiert (negativ = Defizit). */
  adjustment: number;
  proteinPct: number; // % der Kalorien
  carbsPct: number;
  fatPct: number;
  /** Verbrannte Sportkalorien zum Tagesbudget addieren? */
  addExerciseToBudget: boolean;
}

export interface Macros {
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export interface FoodEntry {
  id: string;
  name: string;
  quantity?: string; // z.B. "200 g", "1 Portion"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string; // ISO-Zeitstempel
}

export interface ExerciseEntry {
  id: string;
  name: string;
  durationMin?: number;
  calories: number; // verbrannt
  time: string;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  foods: FoodEntry[];
  exercises: ExerciseEntry[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

export interface Settings {
  apiKey: string;
  model: string;
}

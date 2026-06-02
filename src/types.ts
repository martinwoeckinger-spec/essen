export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type GoalMode = 'lose' | 'maintain' | 'gain';

/** Tageszeitliche Zuordnung einer Mahlzeit. */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealMeta {
  /** Deutsche Beschriftung wie im strukturierten Import. */
  label: string;
  icon: string;
  /** Repräsentative Uhrzeit (für Sortierung importierter Einträge). */
  hour: number;
  /** Anzeige-Reihenfolge in der Tagesansicht. */
  order: number;
}

export const MEALS: Record<MealType, MealMeta> = {
  breakfast: { label: 'Frühstück', icon: '🌅', hour: 8, order: 0 },
  lunch: { label: 'Mittagessen', icon: '☀️', hour: 12, order: 1 },
  dinner: { label: 'Abendessen', icon: '🌙', hour: 19, order: 2 },
  snack: { label: 'Snack', icon: '🍎', hour: 16, order: 3 },
};

/** Mahlzeiten in Anzeige-Reihenfolge. */
export const MEAL_ORDER: MealType[] = (Object.keys(MEALS) as MealType[]).sort(
  (a, b) => MEALS[a].order - MEALS[b].order
);

/** Bevorzugte Ernährungsweise – steuert u.a. Makro-Vorschläge. */
export type DietStyle =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'pescetarian'
  | 'lowcarb'
  | 'highprotein'
  | 'keto'
  | 'mediterranean';

export interface Profile {
  /** Optionaler Name für die persönliche Ansprache. */
  name?: string;
  sex: Sex;
  age: number; // Jahre
  height: number; // cm
  weight: number; // kg
  /** Wunschgewicht in kg (optional). */
  targetWeight?: number;
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

  // --- Genauere Wünsche des Nutzers ---
  /** Bevorzugte Ernährungsweise. */
  dietStyle: DietStyle;
  /** Ballaststoff-Ziel in g/Tag (Richtwert DGE ≈ 30). */
  fiberGoal: number;
  /** Zucker-Limit in g/Tag (WHO ≈ 25–50). */
  sugarLimit: number;
  /** Salz-Limit in g/Tag (WHO ≈ 6). */
  saltLimit: number;
  /** Limit für gesättigte Fettsäuren in g/Tag. */
  satFatLimit: number;
  /** Vorlieben, Abneigungen, Allergien – fließt in KI-Vorschläge ein. */
  preferences: string;
}

export interface Macros {
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

/** Vollständige Nährwert-Summe inkl. der erweiterten Felder. */
export interface NutrientTotals {
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  fat: number;
  saturatedFat: number;
  fiber: number;
  salt: number;
}

export type EntrySource = 'manual' | 'chat' | 'import';

export interface FoodEntry {
  id: string;
  name: string;
  /** Zuordnung zur Mahlzeit (Frühstück/Mittag/Abend/Snack). */
  meal: MealType;
  quantity?: string; // z.B. "200 g", "1 Portion"
  calories: number;
  protein: number;
  carbs: number;
  /** davon Zucker (g). */
  sugar: number;
  fat: number;
  /** davon gesättigte Fettsäuren (g). */
  saturatedFat: number;
  /** Ballaststoffe (g). */
  fiber: number;
  /** Salz (g). */
  salt: number;
  /** Freitext-Notiz aus dem Import oder manuell. */
  note?: string;
  /** Woher der Eintrag stammt (steuert u.a. Zeitanzeige). */
  source: EntrySource;
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

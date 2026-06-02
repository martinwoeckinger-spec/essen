import type {
  ActivityLevel,
  DietStyle,
  FoodEntry,
  Goal,
  Macros,
  MealType,
  NutrientTotals,
  Profile,
} from '../types';
import { MEAL_ORDER } from '../types';

/** PAL-Faktoren für den Alltag (ohne gezielten Sport – der wird separat erfasst). */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sitzend – kaum Bewegung',
  light: 'Leicht aktiv – Bürojob, wenig Sport',
  moderate: 'Mäßig aktiv – viel auf den Beinen',
  active: 'Sehr aktiv – körperliche Arbeit',
  very_active: 'Extrem aktiv – schwere Arbeit',
};

/** Grundumsatz nach Mifflin-St Jeor (kcal/Tag). */
export function bmr(p: Profile): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return Math.round(base + (p.sex === 'male' ? 5 : -161));
}

/** Erhaltungsbedarf = Grundumsatz × Aktivitätsfaktor (ohne Sport). */
export function maintenance(p: Profile): number {
  return Math.round(bmr(p) * ACTIVITY_FACTORS[p.activity]);
}

/** Tagesbudget = Erhaltung + Ziel-Anpassung (+ Sport, falls aktiviert). */
export function dailyBudget(p: Profile, goal: Goal, exerciseCalories: number): number {
  let budget = maintenance(p) + goal.adjustment;
  if (goal.addExerciseToBudget) budget += exerciseCalories;
  return Math.round(budget);
}

export function targetMacros(calories: number, goal: Goal): Macros {
  return {
    protein: Math.round((calories * goal.proteinPct) / 100 / 4),
    carbs: Math.round((calories * goal.carbsPct) / 100 / 4),
    fat: Math.round((calories * goal.fatPct) / 100 / 9),
  };
}

export function sumCalories(foods: FoodEntry[]): number {
  return Math.round(foods.reduce((a, f) => a + (f.calories || 0), 0));
}

export function sumMacros(foods: FoodEntry[]): Macros {
  return {
    protein: Math.round(foods.reduce((a, f) => a + (f.protein || 0), 0)),
    carbs: Math.round(foods.reduce((a, f) => a + (f.carbs || 0), 0)),
    fat: Math.round(foods.reduce((a, f) => a + (f.fat || 0), 0)),
  };
}

export function caloriesFromMacros(m: Macros): number {
  return Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Vollständige Nährwert-Summe inkl. Zucker, ges. FS, Ballaststoffe, Salz. */
export function sumNutrients(foods: FoodEntry[]): NutrientTotals {
  const t: NutrientTotals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    sugar: 0,
    fat: 0,
    saturatedFat: 0,
    fiber: 0,
    salt: 0,
  };
  for (const f of foods) {
    t.calories += f.calories || 0;
    t.protein += f.protein || 0;
    t.carbs += f.carbs || 0;
    t.sugar += f.sugar || 0;
    t.fat += f.fat || 0;
    t.saturatedFat += f.saturatedFat || 0;
    t.fiber += f.fiber || 0;
    t.salt += f.salt || 0;
  }
  return {
    calories: Math.round(t.calories),
    protein: Math.round(t.protein),
    carbs: Math.round(t.carbs),
    sugar: Math.round(t.sugar),
    fat: Math.round(t.fat),
    saturatedFat: Math.round(t.saturatedFat),
    fiber: Math.round(t.fiber),
    salt: round1(t.salt),
  };
}

/** Nährwert-Summen je Mahlzeit (immer alle Mahlzeiten in fester Reihenfolge). */
export function mealTotals(foods: FoodEntry[]): Record<MealType, NutrientTotals> {
  const out = {} as Record<MealType, NutrientTotals>;
  for (const meal of MEAL_ORDER) {
    out[meal] = sumNutrients(foods.filter((f) => f.meal === meal));
  }
  return out;
}

/** Übliche Makro-Verteilung (%) je Ernährungsstil – nur als Vorschlag. */
export const DIET_MACROS: Record<DietStyle, { proteinPct: number; carbsPct: number; fatPct: number }> = {
  omnivore: { proteinPct: 30, carbsPct: 40, fatPct: 30 },
  vegetarian: { proteinPct: 25, carbsPct: 45, fatPct: 30 },
  vegan: { proteinPct: 22, carbsPct: 50, fatPct: 28 },
  pescetarian: { proteinPct: 30, carbsPct: 40, fatPct: 30 },
  lowcarb: { proteinPct: 35, carbsPct: 20, fatPct: 45 },
  highprotein: { proteinPct: 40, carbsPct: 35, fatPct: 25 },
  keto: { proteinPct: 25, carbsPct: 5, fatPct: 70 },
  mediterranean: { proteinPct: 25, carbsPct: 45, fatPct: 30 },
};

export const DIET_LABELS: Record<DietStyle, string> = {
  omnivore: 'Ausgewogen / Allesesser',
  vegetarian: 'Vegetarisch',
  vegan: 'Vegan',
  pescetarian: 'Pescetarisch (mit Fisch)',
  lowcarb: 'Low Carb',
  highprotein: 'High Protein',
  keto: 'Ketogen',
  mediterranean: 'Mediterran',
};

/** ~7700 kcal entsprechen rund 1 kg Körpergewicht. */
export const KCAL_PER_KG = 7700;

/** Geschätzte Gewichtsänderung pro Woche (kg) aus der Ziel-Anpassung. */
export function weeklyWeightChange(adjustmentKcal: number): number {
  return round1((adjustmentKcal * 7) / KCAL_PER_KG);
}

/** Geschätzte Wochen bis zum Wunschgewicht (oder null, wenn nicht bestimmbar). */
export function weeksToTarget(p: Profile, goal: Goal): number | null {
  if (!p.targetWeight || p.targetWeight === p.weight) return null;
  const perWeek = weeklyWeightChange(goal.adjustment);
  if (perWeek === 0) return null;
  const delta = p.targetWeight - p.weight; // negativ = abnehmen
  // Richtung muss zur Anpassung passen, sonst nicht erreichbar.
  if (Math.sign(delta) !== Math.sign(perWeek)) return null;
  return Math.ceil(Math.abs(delta) / Math.abs(perWeek));
}

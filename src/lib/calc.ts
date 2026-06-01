import type { ActivityLevel, FoodEntry, Goal, Macros, Profile } from '../types';

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

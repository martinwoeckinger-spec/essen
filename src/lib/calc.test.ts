import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_FACTORS,
  bmr,
  maintenance,
  dailyBudget,
  targetMacros,
  sumCalories,
  sumMacros,
  sumNutrients,
  mealTotals,
  weeklyWeightChange,
  weeksToTarget,
  caloriesFromMacros,
} from './calc';
import type { FoodEntry, Goal, Profile } from '../types';

const maleProfile: Profile = {
  sex: 'male',
  age: 30,
  height: 180,
  weight: 80,
  activity: 'light',
};

const femaleProfile: Profile = {
  sex: 'female',
  age: 30,
  height: 180,
  weight: 80,
  activity: 'light',
};

const maintainGoal: Goal = {
  mode: 'maintain',
  adjustment: 0,
  proteinPct: 30,
  carbsPct: 40,
  fatPct: 30,
  addExerciseToBudget: true,
};

function food(partial: Partial<FoodEntry>): FoodEntry {
  return {
    id: 'x',
    name: 'Test',
    meal: 'snack',
    calories: 0,
    protein: 0,
    carbs: 0,
    sugar: 0,
    fat: 0,
    saturatedFat: 0,
    fiber: 0,
    salt: 0,
    source: 'manual',
    time: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('bmr (Mifflin-St Jeor)', () => {
  it('berechnet den Grundumsatz für Männer (+5)', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmr(maleProfile)).toBe(1780);
  });

  it('berechnet den Grundumsatz für Frauen (-161)', () => {
    // 10*80 + 6.25*180 - 5*30 - 161 = 1614
    expect(bmr(femaleProfile)).toBe(1614);
  });

  it('Männer haben bei gleichem Körper einen höheren Grundumsatz', () => {
    expect(bmr(maleProfile)).toBeGreaterThan(bmr(femaleProfile));
    expect(bmr(maleProfile) - bmr(femaleProfile)).toBe(166);
  });

  it('sinkt mit zunehmendem Alter', () => {
    expect(bmr({ ...maleProfile, age: 50 })).toBeLessThan(bmr(maleProfile));
  });
});

describe('maintenance (Erhaltungsbedarf)', () => {
  it('multipliziert den Grundumsatz mit dem Aktivitätsfaktor', () => {
    // 1780 * 1.375 = 2447.5 -> 2448
    expect(maintenance(maleProfile)).toBe(2448);
  });

  it('steigt mit höherer Aktivitätsstufe', () => {
    const sedentary = maintenance({ ...maleProfile, activity: 'sedentary' });
    const veryActive = maintenance({ ...maleProfile, activity: 'very_active' });
    expect(veryActive).toBeGreaterThan(sedentary);
  });

  it('nutzt die definierten PAL-Faktoren', () => {
    expect(maintenance({ ...maleProfile, activity: 'sedentary' })).toBe(
      Math.round(1780 * ACTIVITY_FACTORS.sedentary)
    );
  });
});

describe('dailyBudget', () => {
  it('entspricht ohne Sport und ohne Anpassung dem Erhaltungsbedarf', () => {
    expect(dailyBudget(maleProfile, maintainGoal, 0)).toBe(maintenance(maleProfile));
  });

  it('addiert Sportkalorien, wenn aktiviert', () => {
    expect(dailyBudget(maleProfile, maintainGoal, 300)).toBe(maintenance(maleProfile) + 300);
  });

  it('ignoriert Sportkalorien, wenn deaktiviert', () => {
    const goal: Goal = { ...maintainGoal, addExerciseToBudget: false };
    expect(dailyBudget(maleProfile, goal, 300)).toBe(maintenance(maleProfile));
  });

  it('berücksichtigt ein Kaloriendefizit', () => {
    const goal: Goal = { ...maintainGoal, adjustment: -500 };
    expect(dailyBudget(maleProfile, goal, 0)).toBe(maintenance(maleProfile) - 500);
  });

  it('kombiniert Defizit und Sport korrekt', () => {
    const goal: Goal = { ...maintainGoal, adjustment: -500 };
    expect(dailyBudget(maleProfile, goal, 400)).toBe(maintenance(maleProfile) - 500 + 400);
  });
});

describe('targetMacros', () => {
  it('teilt Kalorien nach Prozenten auf (4/4/9 kcal/g)', () => {
    const m = targetMacros(2000, maintainGoal);
    expect(m.protein).toBe(150); // 2000*0.3/4
    expect(m.carbs).toBe(200); // 2000*0.4/4
    expect(m.fat).toBe(67); // 2000*0.3/9 = 66.67 -> 67
  });

  it('die Makros ergeben in etwa die Zielkalorien zurück', () => {
    const cals = 2200;
    const m = targetMacros(cals, maintainGoal);
    // Rundung erlaubt eine kleine Abweichung
    expect(Math.abs(caloriesFromMacros(m) - cals)).toBeLessThanOrEqual(10);
  });
});

describe('Summen über Tageseinträge', () => {
  const foods: FoodEntry[] = [
    food({ calories: 250, protein: 10, carbs: 30, fat: 8 }),
    food({ calories: 410, protein: 35, carbs: 12, fat: 20 }),
    food({ calories: 95, protein: 1, carbs: 24, fat: 0 }),
  ];

  it('summiert Kalorien', () => {
    expect(sumCalories(foods)).toBe(755);
  });

  it('summiert Makros einzeln', () => {
    expect(sumMacros(foods)).toEqual({ protein: 46, carbs: 66, fat: 28 });
  });

  it('liefert Nullwerte für eine leere Liste', () => {
    expect(sumCalories([])).toBe(0);
    expect(sumMacros([])).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('caloriesFromMacros', () => {
  it('rechnet Gramm in Kalorien um (4/4/9)', () => {
    expect(caloriesFromMacros({ protein: 50, carbs: 100, fat: 30 })).toBe(50 * 4 + 100 * 4 + 30 * 9);
  });
});

describe('sumNutrients', () => {
  const foods: FoodEntry[] = [
    food({ calories: 260, protein: 14, carbs: 19, sugar: 19, fat: 14, saturatedFat: 9, fiber: 0, salt: 0.4 }),
    food({ calories: 52, protein: 1, carbs: 12, sugar: 4, fat: 1, saturatedFat: 0, fiber: 7, salt: 0 }),
  ];

  it('summiert alle erweiterten Nährwerte', () => {
    expect(sumNutrients(foods)).toEqual({
      calories: 312,
      protein: 15,
      carbs: 31,
      sugar: 23,
      fat: 15,
      saturatedFat: 9,
      fiber: 7,
      salt: 0.4,
    });
  });

  it('rundet Salz auf eine Nachkommastelle', () => {
    const t = sumNutrients([food({ salt: 0.15 }), food({ salt: 0.2 })]);
    expect(t.salt).toBe(0.4); // 0.35 -> 0.4 (round)
  });

  it('liefert Nullwerte für eine leere Liste', () => {
    expect(sumNutrients([])).toEqual({
      calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, saturatedFat: 0, fiber: 0, salt: 0,
    });
  });
});

describe('mealTotals', () => {
  it('gruppiert die Nährwerte nach Mahlzeit', () => {
    const foods: FoodEntry[] = [
      food({ meal: 'breakfast', calories: 300, protein: 20 }),
      food({ meal: 'breakfast', calories: 100, protein: 5 }),
      food({ meal: 'lunch', calories: 600, protein: 40 }),
    ];
    const t = mealTotals(foods);
    expect(t.breakfast.calories).toBe(400);
    expect(t.breakfast.protein).toBe(25);
    expect(t.lunch.calories).toBe(600);
    expect(t.dinner.calories).toBe(0);
    expect(t.snack.calories).toBe(0);
  });
});

describe('weeklyWeightChange', () => {
  it('rechnet ein Defizit in kg/Woche um (~7700 kcal/kg)', () => {
    // -500 * 7 / 7700 = -0.4545 -> -0.5
    expect(weeklyWeightChange(-500)).toBe(-0.5);
  });
  it('ist 0 ohne Anpassung', () => {
    expect(weeklyWeightChange(0)).toBe(0);
  });
});

describe('weeksToTarget', () => {
  const base: Profile = { sex: 'male', age: 30, height: 180, weight: 90, activity: 'light' };
  const goal: Goal = {
    mode: 'lose', adjustment: -500, proteinPct: 30, carbsPct: 40, fatPct: 30,
    addExerciseToBudget: true, dietStyle: 'omnivore', fiberGoal: 30, sugarLimit: 50,
    saltLimit: 6, satFatLimit: 20, preferences: '',
  };

  it('schätzt die Wochen bis zum Wunschgewicht', () => {
    // 90 -> 80 = 10 kg, bei 0.5 kg/Woche => 20 Wochen
    expect(weeksToTarget({ ...base, targetWeight: 80 }, goal)).toBe(20);
  });

  it('liefert null, wenn kein Wunschgewicht gesetzt ist', () => {
    expect(weeksToTarget(base, goal)).toBeNull();
  });

  it('liefert null, wenn die Richtung nicht zum Ziel passt', () => {
    // Defizit, aber Wunschgewicht über dem aktuellen Gewicht
    expect(weeksToTarget({ ...base, targetWeight: 95 }, goal)).toBeNull();
  });
});

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173';

// --- Beispieldaten im zustand-persist-Format aufbauen ---
function dayKey(offset) {
  const d = new Date('2026-06-01T12:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function food(name, quantity, calories, protein, carbs, fat, hour) {
  return {
    id: Math.random().toString(36).slice(2),
    name,
    quantity,
    calories,
    protein,
    carbs,
    fat,
    time: `${dayKey(0)}T${String(hour).padStart(2, '0')}:30:00.000Z`,
  };
}

const today = {
  date: dayKey(0),
  foods: [
    food('Haferflocken mit Beeren & Skyr', '350 g', 420, 28, 58, 8, 7),
    food('Cappuccino', '1 Tasse', 90, 5, 9, 4, 8),
    food('Hähnchenbrust mit Reis & Brokkoli', '1 Portion', 610, 52, 62, 14, 12),
    food('Apfel', '1 Stück', 95, 0, 25, 0, 16),
  ],
  exercises: [
    {
      id: 'e1',
      name: 'Joggen',
      durationMin: 35,
      calories: 380,
      time: `${dayKey(0)}T18:00:00.000Z`,
    },
  ],
};

// Vortage für das Verlaufsdiagramm
const past = {};
const kcals = [1980, 2240, 1750, 2100, 1890, 2050];
for (let i = 1; i <= 6; i++) {
  const k = dayKey(-i);
  const total = kcals[i - 1];
  past[k] = {
    date: k,
    foods: [
      food('Frühstück', '', Math.round(total * 0.3), 20, 45, 12, 8),
      food('Mittagessen', '', Math.round(total * 0.4), 35, 55, 18, 13),
      food('Abendessen', '', Math.round(total * 0.3), 28, 40, 15, 19),
    ],
    exercises: i % 2 === 0 ? [{ id: 'x' + i, name: 'Krafttraining', durationMin: 45, calories: 300, time: k }] : [],
  };
}

const persisted = {
  state: {
    profile: { sex: 'male', age: 32, height: 182, weight: 84, activity: 'moderate' },
    goal: { mode: 'lose', adjustment: -500, proteinPct: 35, carbsPct: 35, fatPct: 30, addExerciseToBudget: true },
    settings: { apiKey: '', model: 'claude-sonnet-4-6' },
    days: { [today.date]: today, ...past },
    chat: [],
  },
  version: 1,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const page = await ctx.newPage();

// localStorage vor dem App-Start setzen
await page.addInitScript((data) => {
  localStorage.setItem('essen-store', data);
}, JSON.stringify(persisted));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Scrollen passiert in einem Flex-Container statt im Dokument -> fullPage
// würde abschneiden. Layout für die Aufnahme in den normalen Fluss bringen.
const captureCss = `
  .app { height: auto !important; }
  .content { overflow: visible !important; height: auto !important; }
  .chat-page, .messages { height: auto !important; }
  .tabbar { position: static !important; }
`;

async function shot(name) {
  await page.addStyleTag({ content: captureCss });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  console.log('screenshot:', name);
}

// Tab 1: Heute
await shot('1-heute');

// Tab 2: KI-Chat (leerer Zustand mit Beispielen)
await page.getByRole('button', { name: /KI-Chat/ }).click();
await page.waitForTimeout(400);
await shot('2-chat');

// Tab 3: Auswertung
await page.getByRole('button', { name: /Auswertung/ }).click();
await page.waitForTimeout(400);
await shot('3-auswertung');

// Tab 4: Profil
await page.getByRole('button', { name: /Profil/ }).click();
await page.waitForTimeout(400);
await shot('4-profil');

await browser.close();
console.log('fertig');

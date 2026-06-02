import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';

// Tage relativ zum echten "heute" (damit die Tagesansicht zuverlässig Daten zeigt).
function dayKey(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

let n = 0;
function food(date, meal, name, quantity, cal, p, c, sugar, fat, satfat, fiber, salt, note) {
  const hour = { breakfast: 8, lunch: 12, dinner: 19, snack: 16 }[meal];
  return {
    id: `f${n++}`,
    name,
    meal,
    quantity,
    calories: cal,
    protein: p,
    carbs: c,
    sugar,
    fat,
    saturatedFat: satfat,
    fiber,
    salt,
    note,
    source: 'import',
    time: `${date}T${String(hour).padStart(2, '0')}:30:00.000Z`,
  };
}

// Heute: die Beispieldaten aus der Aufgabenstellung (mit Mahlzeit-Zuordnung).
const T = dayKey(0);
const today = {
  date: T,
  foods: [
    food(T, 'breakfast', 'Naturjoghurt', '400 g', 260, 14, 19, 19, 14, 9, 0, 0.4, 'Vollmilchjoghurt 3,5%'),
    food(T, 'breakfast', 'Himbeeren', '100 g', 52, 1, 12, 4, 1, 0, 7, 0, 'frisch'),
    food(T, 'breakfast', 'Brombeeren', '100 g', 43, 1, 10, 5, 0, 0, 5, 0, 'frisch'),
    food(T, 'lunch', 'Chicken-Panade-Salat', '1 Portion', 550, 35, 30, 5, 30, 6, 5, 1.5, 'Restaurantportion'),
    food(T, 'snack', 'Proteinriegel', '1 Stk (~50 g)', 200, 20, 18, 3, 7, 4, 2, 0.3, 'typ. Riegel ~50 g'),
    food(T, 'snack', 'Cottage Cheese', '1 Becher (~200 g)', 200, 24, 7, 7, 9, 6, 0, 1.8, '~4% Fett'),
    food(T, 'snack', 'Whey-Pulver mit Wasser', '1 Portion (~30 g)', 115, 24, 3, 2, 2, 1, 0, 0.2, '1 Scoop 30 g, in Wasser'),
  ],
  exercises: [{ id: 'e1', name: 'Joggen', durationMin: 35, calories: 380, time: `${T}T18:00:00.000Z` }],
};

// Vortage für Archiv und Zeitverlauf.
const past = {};
const kcals = [1980, 2240, 1750, 2100, 1890, 2050, 1820, 2160, 1930, 2010, 1760, 2080, 1990];
for (let i = 1; i <= 13; i++) {
  const k = dayKey(-i);
  const total = kcals[i - 1];
  past[k] = {
    date: k,
    foods: [
      food(k, 'breakfast', 'Haferflocken mit Skyr', '1 Schüssel', Math.round(total * 0.3), 25, 45, 12, 9, 3, 7, 0.4, ''),
      food(k, 'lunch', 'Bowl mit Hähnchen', '1 Portion', Math.round(total * 0.4), 40, 55, 8, 14, 4, 9, 1.6, ''),
      food(k, 'dinner', 'Gemüsepfanne mit Tofu', '1 Portion', Math.round(total * 0.3), 28, 38, 10, 16, 3, 11, 1.2, ''),
    ],
    exercises: i % 2 === 0 ? [{ id: 'x' + i, name: 'Krafttraining', durationMin: 45, calories: 300, time: k }] : [],
  };
}

const persisted = {
  state: {
    profile: { name: 'Martin', sex: 'male', age: 32, height: 182, weight: 84, targetWeight: 78, activity: 'moderate' },
    goal: {
      mode: 'lose', adjustment: -500, proteinPct: 35, carbsPct: 35, fatPct: 30, addExerciseToBudget: true,
      dietStyle: 'highprotein', fiberGoal: 30, sugarLimit: 50, saltLimit: 6, satFatLimit: 20,
      preferences: 'viel Eiweiß, keine Innereien, mag Beeren',
    },
    settings: { apiKey: '', model: 'claude-sonnet-4-6' },
    days: { [today.date]: today, ...past },
    chat: [],
  },
  version: 2,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const page = await ctx.newPage();

await page.addInitScript((data) => {
  localStorage.setItem('essen-store', data);
}, JSON.stringify(persisted));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Scroll-Container und fixe Overlays für die Vollbild-Aufnahme in den Fluss bringen.
const captureCss = `
  .app { height: auto !important; }
  .content { overflow: visible !important; height: auto !important; }
  .chat-page, .messages { height: auto !important; }
  .tabbar { position: static !important; }
  .overlay { position: static !important; }
  .overlay-body { overflow: visible !important; height: auto !important; }
`;

async function shot(name) {
  await page.addStyleTag({ content: captureCss });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  console.log('screenshot:', name);
}

// 1: Heute (Mahlzeit-Gruppen + erweiterte Nährwerte)
await shot('1-heute');

// 2: Import-Dialog mit Vorschau
await page.getByRole('button', { name: /Import/ }).first().click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Beispiel einfügen/ }).click();
await page.waitForTimeout(400);
await shot('2-import');
await page.getByRole('button', { name: /Schließen/ }).click();
await page.waitForTimeout(300);

// 3: Analyse (Zeitverlauf + Auswertungen)
await page.getByRole('button', { name: /Analyse/ }).click();
await page.waitForTimeout(400);
await shot('3-analyse');

// 4: Archiv
await page.getByRole('button', { name: /Archiv/ }).click();
await page.waitForTimeout(400);
await shot('4-archiv');

// 5: Profil
await page.getByRole('button', { name: /Profil/ }).click();
await page.waitForTimeout(400);
await shot('5-profil');

await browser.close();
console.log('fertig');

import type { FoodEntry, MealType, NutrientTotals } from '../types';
import { MEALS } from '../types';

/**
 * Strukturierter Import von Nahrungsmitteln.
 *
 * Erwartetes Spaltenformat (Tab- oder Pipe-getrennt), wie aus einer Tabelle
 * kopiert. Datum und Mahlzeit werden automatisch zugeordnet:
 *
 *   Datum  Mahlzeit  Nahrungsmittel  Menge  kcal  Eiweiß  KH  Zucker  Fett  ges.FS  Ballaststoffe  Salz  Notiz
 *
 * Deutsche Zahlen mit Komma ("0,4") werden korrekt erkannt. Notizen dürfen
 * Kommas und Leerzeichen enthalten (deshalb wird nach Tab/Pipe getrennt).
 */

export interface ParsedRow {
  date: string; // YYYY-MM-DD
  meal: MealType;
  /** Ursprüngliche Mahlzeit-Bezeichnung aus dem Import. */
  mealLabel: string;
  name: string;
  quantity?: string;
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  fat: number;
  saturatedFat: number;
  fiber: number;
  salt: number;
  note?: string;
}

export interface ParseError {
  line: number; // 1-basiert, bezogen auf die Eingabe
  text: string;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: ParseError[];
}

const MEAL_ALIASES: Record<string, MealType> = {
  frühstück: 'breakfast',
  fruehstueck: 'breakfast',
  fruhstuck: 'breakfast',
  breakfast: 'breakfast',
  morgens: 'breakfast',
  mittagessen: 'lunch',
  mittag: 'lunch',
  lunch: 'lunch',
  abendessen: 'dinner',
  abendbrot: 'dinner',
  abend: 'dinner',
  dinner: 'dinner',
  snack: 'snack',
  snacks: 'snack',
  zwischenmahlzeit: 'snack',
  zwischendurch: 'snack',
  zwischen: 'snack',
  imbiss: 'snack',
};

/** Mahlzeit-Bezeichnung → MealType (unbekannt ⇒ 'snack'). */
export function parseMeal(raw: string): MealType {
  const key = raw.trim().toLowerCase();
  return MEAL_ALIASES[key] ?? 'snack';
}

const pad = (s: string | number) => String(s).padStart(2, '0');

/** Erkennt DD.MM.YYYY, D.M.YY, YYYY-MM-DD, DD/MM/YYYY → YYYY-MM-DD. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return `${year}-${pad(m[2])}-${pad(m[1])}`;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return `${year}-${pad(m[2])}-${pad(m[1])}`;
  }
  return null;
}

/** Deutsche/englische Zahl mit optionaler Einheit → number (Fallback 0). */
export function parseNumber(raw: string | undefined): number {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s || s === '-' || s === '–' || /^(n\/a|k\.?\s?a\.?)$/i.test(s)) return 0;
  s = s.replace(/[^0-9.,-]/g, ''); // Einheiten wie "g", "kcal" entfernen
  if (s.includes(',') && s.includes('.')) {
    // "1.234,5" → Punkt = Tausender, Komma = Dezimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  if (line.includes('|')) {
    const parts = line.split('|').map((c) => c.trim());
    if (parts.length && parts[0] === '') parts.shift();
    if (parts.length && parts[parts.length - 1] === '') parts.pop();
    return parts;
  }
  return line.split(/\s{2,}/).map((c) => c.trim()); // Fallback: 2+ Leerzeichen
}

const isSeparatorRow = (cells: string[]) =>
  cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '');

const isHeaderRow = (cells: string[]) =>
  parseDate(cells[0] ?? '') === null &&
  /datum|mahlzeit|kalorien|kcal|eiwei|protein|nahrungs/i.test(cells.join(' '));

/**
 * Parst den eingefügten Text in strukturierte Zeilen. Nicht erkannte Zeilen
 * landen in `errors`, alle anderen in `rows` – der Import bricht nie komplett ab.
 */
export function parseStructured(input: string): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];
  const lines = input.replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const cells = splitRow(raw);
    if (isSeparatorRow(cells)) return;
    if (isHeaderRow(cells)) return;

    if (cells.length < 5) {
      errors.push({
        line: lineNo,
        text: trimmed,
        reason: 'Zu wenige Spalten (mind. Datum, Mahlzeit, Name, Menge, kcal – Tab-getrennt).',
      });
      return;
    }

    const date = parseDate(cells[0]);
    if (!date) {
      errors.push({ line: lineNo, text: trimmed, reason: `Datum "${cells[0]}" nicht erkannt.` });
      return;
    }
    const name = (cells[2] ?? '').trim();
    if (!name) {
      errors.push({ line: lineNo, text: trimmed, reason: 'Kein Nahrungsmittel-Name.' });
      return;
    }

    const note = (cells[12] ?? '').trim();
    rows.push({
      date,
      meal: parseMeal(cells[1] ?? ''),
      mealLabel: (cells[1] ?? '').trim() || MEALS[parseMeal(cells[1] ?? '')].label,
      name,
      quantity: (cells[3] ?? '').trim() || undefined,
      calories: parseNumber(cells[4]),
      protein: parseNumber(cells[5]),
      carbs: parseNumber(cells[6]),
      sugar: parseNumber(cells[7]),
      fat: parseNumber(cells[8]),
      saturatedFat: parseNumber(cells[9]),
      fiber: parseNumber(cells[10]),
      salt: parseNumber(cells[11]),
      note: note || undefined,
    });
  });

  return { rows, errors };
}

/** Summiert die Nährwerte einer Liste geparster Zeilen. */
export function sumParsed(rows: ParsedRow[]): NutrientTotals {
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
  for (const r of rows) {
    t.calories += r.calories;
    t.protein += r.protein;
    t.carbs += r.carbs;
    t.sugar += r.sugar;
    t.fat += r.fat;
    t.saturatedFat += r.saturatedFat;
    t.fiber += r.fiber;
    t.salt += r.salt;
  }
  return t;
}

const deNum = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const deDate = (key: string) => {
  const [y, m, d] = key.split('-');
  return `${d}.${m}.${y}`;
};

/**
 * Serialisiert Einträge zurück in das strukturierte Tab-Format (Round-Trip /
 * Export). Spiegelt exakt die von {@link parseStructured} erwartete Reihenfolge.
 */
export function serializeEntries(
  entries: { date: string; entry: FoodEntry }[]
): string {
  return entries
    .map(({ date, entry: e }) =>
      [
        deDate(date),
        MEALS[e.meal].label,
        e.name,
        e.quantity ?? '',
        deNum(e.calories),
        deNum(e.protein),
        deNum(e.carbs),
        deNum(e.sugar),
        deNum(e.fat),
        deNum(e.saturatedFat),
        deNum(e.fiber),
        deNum(e.salt),
        e.note ?? '',
      ].join('\t')
    )
    .join('\n');
}

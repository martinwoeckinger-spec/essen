import { describe, it, expect } from 'vitest';
import {
  parseDate,
  parseMeal,
  parseNumber,
  parseStructured,
  serializeEntries,
  sumParsed,
} from './parse';
import type { FoodEntry } from '../types';

const EXAMPLE = [
  '02.06.2026\tFrühstück\tNaturjoghurt\t400 g\t260\t14\t19\t19\t14\t9\t0\t0,4\tVollmilchjoghurt 3,5%',
  '02.06.2026\tFrühstück\tHimbeeren\t100 g\t52\t1\t12\t4\t1\t0\t7\t0\tfrisch',
  '02.06.2026\tFrühstück\tBrombeeren\t100 g\t43\t1\t10\t5\t0\t0\t5\t0\tfrisch',
  '02.06.2026\tSnack\tProteinriegel\t1 Stk (~50 g)\t200\t20\t18\t3\t7\t4\t2\t0,3\ttyp. Riegel ~50 g, Marke unbekannt',
  '02.06.2026\tMittagessen\tChicken-Panade-Salat\t1 Portion\t550\t35\t30\t5\t30\t6\t5\t1,5\tpaniertes Hähnchen frittiert, Salat mit Dressing; Restaurantportion',
  '02.06.2026\tSnack\tCottage Cheese\t1 Becher (~200 g)\t200\t24\t7\t7\t9\t6\t0\t1,8\tStandardbecher 200 g, ~4% Fett',
  '02.06.2026\tSnack\tWhey-Pulver mit Wasser\t1 Portion (~30 g)\t115\t24\t3\t2\t2\t1\t0\t0,2\t1 Scoop 30 g, in Wasser',
].join('\n');

describe('parseNumber (deutsche Zahlen)', () => {
  it('liest Komma als Dezimaltrennzeichen', () => {
    expect(parseNumber('0,4')).toBe(0.4);
    expect(parseNumber('1,5')).toBe(1.5);
  });
  it('liest ganze Zahlen', () => {
    expect(parseNumber('260')).toBe(260);
  });
  it('ignoriert Einheiten', () => {
    expect(parseNumber('12 g')).toBe(12);
    expect(parseNumber('260 kcal')).toBe(260);
  });
  it('versteht Tausenderpunkt mit Dezimalkomma', () => {
    expect(parseNumber('1.234,5')).toBe(1234.5);
  });
  it('liefert 0 für leer/unbekannt', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('-')).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
  });
});

describe('parseDate', () => {
  it('wandelt DD.MM.YYYY in ISO um', () => {
    expect(parseDate('02.06.2026')).toBe('2026-06-02');
  });
  it('akzeptiert kurze Tag/Monat und 2-stelliges Jahr', () => {
    expect(parseDate('2.6.26')).toBe('2026-06-02');
  });
  it('lässt ISO unverändert (normalisiert)', () => {
    expect(parseDate('2026-6-2')).toBe('2026-06-02');
  });
  it('liefert null bei Unsinn', () => {
    expect(parseDate('Datum')).toBeNull();
  });
});

describe('parseMeal', () => {
  it('ordnet deutsche Bezeichnungen zu', () => {
    expect(parseMeal('Frühstück')).toBe('breakfast');
    expect(parseMeal('Mittagessen')).toBe('lunch');
    expect(parseMeal('Abendessen')).toBe('dinner');
    expect(parseMeal('Snack')).toBe('snack');
  });
  it('ist gegen Groß/Kleinschreibung robust', () => {
    expect(parseMeal('  MITTAG ')).toBe('lunch');
  });
  it('fällt bei Unbekanntem auf snack zurück', () => {
    expect(parseMeal('Brunch')).toBe('snack');
  });
});

describe('parseStructured (Beispieldaten)', () => {
  const res = parseStructured(EXAMPLE);

  it('parst alle 7 Zeilen ohne Fehler', () => {
    expect(res.rows).toHaveLength(7);
    expect(res.errors).toHaveLength(0);
  });

  it('ordnet Datum und Mahlzeit korrekt zu', () => {
    expect(res.rows[0].date).toBe('2026-06-02');
    expect(res.rows[0].meal).toBe('breakfast');
    expect(res.rows[4].meal).toBe('lunch');
  });

  it('liest alle Nährwert-Spalten der ersten Zeile', () => {
    const r = res.rows[0];
    expect(r).toMatchObject({
      name: 'Naturjoghurt',
      quantity: '400 g',
      calories: 260,
      protein: 14,
      carbs: 19,
      sugar: 19,
      fat: 14,
      saturatedFat: 9,
      fiber: 0,
      salt: 0.4,
      note: 'Vollmilchjoghurt 3,5%',
    });
  });

  it('behält Kommas in der Notiz (Tab-Trennung)', () => {
    const whey = res.rows[6];
    expect(whey.name).toBe('Whey-Pulver mit Wasser');
    expect(whey.note).toBe('1 Scoop 30 g, in Wasser');
    expect(whey.salt).toBe(0.2);
  });

  it('summiert die Nährwerte', () => {
    const t = sumParsed(res.rows);
    expect(t.calories).toBe(1420); // 260+52+43+200+550+200+115
    expect(t.protein).toBe(119);
    expect(t.fiber).toBe(19); // 0+7+5+2+5+0+0
  });
});

describe('parseStructured (Robustheit)', () => {
  it('überspringt eine Kopfzeile', () => {
    const input =
      'Datum\tMahlzeit\tName\tMenge\tkcal\tEiweiß\tKH\tZucker\tFett\tges\tBst\tSalz\tNotiz\n' +
      '02.06.2026\tSnack\tApfel\t1 Stk\t52\t0\t14\t10\t0\t0\t2\t0\tfrisch';
    const res = parseStructured(input);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].name).toBe('Apfel');
  });

  it('versteht Markdown-Pipe-Tabellen inkl. Trennzeile', () => {
    const input =
      '| 02.06.2026 | Snack | Banane | 1 Stk | 90 | 1 | 23 | 12 | 0 | 0 | 3 | 0 | reif |\n' +
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
    const res = parseStructured(input);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].name).toBe('Banane');
    expect(res.rows[0].meal).toBe('snack');
  });

  it('meldet fehlerhafte Zeilen, parst den Rest aber weiter', () => {
    const input =
      'kaputte zeile ohne tabs\n' +
      '02.06.2026\tSnack\tEi\t1 Stk\t78\t6\t1\t0\t5\t2\t0\t0,1\tgekocht';
    const res = parseStructured(input);
    expect(res.rows).toHaveLength(1);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].line).toBe(1);
  });
});

describe('serializeEntries (Round-Trip)', () => {
  it('serialisiert und parst wieder zum gleichen Ergebnis', () => {
    const parsed = parseStructured(EXAMPLE).rows;
    const entries: { date: string; entry: FoodEntry }[] = parsed.map((r, i) => ({
      date: r.date,
      entry: {
        id: String(i),
        name: r.name,
        meal: r.meal,
        quantity: r.quantity,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        sugar: r.sugar,
        fat: r.fat,
        saturatedFat: r.saturatedFat,
        fiber: r.fiber,
        salt: r.salt,
        note: r.note,
        source: 'import',
        time: '2026-06-02T08:00:00.000Z',
      },
    }));
    const tsv = serializeEntries(entries);
    const reparsed = parseStructured(tsv).rows;
    expect(reparsed).toHaveLength(parsed.length);
    expect(reparsed[0]).toMatchObject({
      name: 'Naturjoghurt',
      calories: 260,
      salt: 0.4,
      note: 'Vollmilchjoghurt 3,5%',
    });
    expect(reparsed[6].note).toBe('1 Scoop 30 g, in Wasser');
  });
});

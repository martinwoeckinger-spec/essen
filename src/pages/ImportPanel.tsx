import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { parseStructured, sumParsed } from '../lib/parse';
import type { ParsedRow } from '../lib/parse';
import { MEALS, MEAL_ORDER } from '../types';
import { formatFullDate } from '../lib/date';
import { Overlay } from '../components/ui';

const EXAMPLE = [
  '02.06.2026\tFrühstück\tNaturjoghurt\t400 g\t260\t14\t19\t19\t14\t9\t0\t0,4\tVollmilchjoghurt 3,5%',
  '02.06.2026\tFrühstück\tHimbeeren\t100 g\t52\t1\t12\t4\t1\t0\t7\t0\tfrisch',
  '02.06.2026\tFrühstück\tBrombeeren\t100 g\t43\t1\t10\t5\t0\t0\t5\t0\tfrisch',
  '02.06.2026\tSnack\tProteinriegel\t1 Stk (~50 g)\t200\t20\t18\t3\t7\t4\t2\t0,3\ttyp. Riegel ~50 g',
  '02.06.2026\tMittagessen\tChicken-Panade-Salat\t1 Portion\t550\t35\t30\t5\t30\t6\t5\t1,5\tRestaurantportion',
  '02.06.2026\tSnack\tCottage Cheese\t1 Becher (~200 g)\t200\t24\t7\t7\t9\t6\t0\t1,8\t~4% Fett',
  '02.06.2026\tSnack\tWhey-Pulver mit Wasser\t1 Portion (~30 g)\t115\t24\t3\t2\t2\t1\t0\t0,2\t1 Scoop 30 g, in Wasser',
].join('\n');

export default function ImportPanel() {
  const setImportOpen = useStore((s) => s.setImportOpen);
  const importEntries = useStore((s) => s.importEntries);
  const setSelectedDate = useStore((s) => s.setSelectedDate);

  const [text, setText] = useState('');
  const [replaceDays, setReplaceDays] = useState(false);
  const [done, setDone] = useState<{ added: number; days: number } | null>(null);

  const result = useMemo(() => parseStructured(text), [text]);
  const totals = useMemo(() => sumParsed(result.rows), [result.rows]);

  // Geparste Zeilen nach Datum gruppieren (sortiert).
  const byDate = useMemo(() => {
    const map = new Map<string, ParsedRow[]>();
    for (const r of result.rows) {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [result.rows]);

  function doImport() {
    if (!result.rows.length) return;
    const res = importEntries(result.rows, replaceDays);
    setDone(res);
    // Auf den ersten importierten Tag springen.
    const first = [...new Set(result.rows.map((r) => r.date))].sort()[0];
    if (first) setSelectedDate(first);
  }

  if (done) {
    return (
      <Overlay title="Import abgeschlossen" onClose={() => setImportOpen(false)}>
        <div className="card">
          <p className="import-success">
            ✅ {done.added} Einträge auf {done.days} {done.days === 1 ? 'Tag' : 'Tage'} verteilt.
          </p>
          <p className="muted small">
            Datum und Mahlzeit wurden automatisch zugeordnet. Du findest alles unter „Heute" und im
            Archiv.
          </p>
          <button className="primary" onClick={() => setImportOpen(false)}>
            Fertig
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay title="Strukturiert importieren" onClose={() => setImportOpen(false)}>
      <div className="card">
        <p className="muted small" style={{ marginTop: 0 }}>
          Tabelle aus der Zwischenablage einfügen (Tab- oder |-getrennt). Spaltenreihenfolge:
        </p>
        <code className="import-cols">
          Datum · Mahlzeit · Nahrungsmittel · Menge · kcal · Eiweiß · KH · Zucker · Fett · ges.&nbsp;FS
          · Ballaststoffe · Salz · Notiz
        </code>
        <textarea
          className="import-text"
          placeholder="Hier die Tabelle einfügen…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
        />
        <div className="import-actions">
          <button className="chip" onClick={() => setText(EXAMPLE)}>
            Beispiel einfügen
          </button>
          {text && (
            <button className="chip" onClick={() => setText('')}>
              Leeren
            </button>
          )}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="card import-warn">
          <h3 className="card-title">⚠ {result.errors.length} Zeile(n) übersprungen</h3>
          <ul className="err-list">
            {result.errors.slice(0, 8).map((e) => (
              <li key={e.line}>
                <strong>Zeile {e.line}:</strong> {e.reason}
                <div className="muted small ellipsis">{e.text}</div>
              </li>
            ))}
            {result.errors.length > 8 && (
              <li className="muted small">… und {result.errors.length - 8} weitere</li>
            )}
          </ul>
        </div>
      )}

      {result.rows.length > 0 && (
        <>
          <div className="card">
            <div className="hero-stats three">
              <div className="stat">
                <div className="stat-value">{result.rows.length}</div>
                <div className="stat-label">Einträge</div>
              </div>
              <div className="stat">
                <div className="stat-value">{byDate.length}</div>
                <div className="stat-label">{byDate.length === 1 ? 'Tag' : 'Tage'}</div>
              </div>
              <div className="stat">
                <div className="stat-value">{totals.calories}</div>
                <div className="stat-label">kcal gesamt</div>
              </div>
            </div>
          </div>

          {byDate.map(([date, rows]) => (
            <div className="card" key={date}>
              <h3 className="card-title">{formatFullDate(date)}</h3>
              {MEAL_ORDER.map((meal) => {
                const items = rows.filter((r) => r.meal === meal);
                if (!items.length) return null;
                return (
                  <div key={meal} className="preview-meal">
                    <div className="preview-meal-head">
                      {MEALS[meal].icon} {MEALS[meal].label}
                    </div>
                    {items.map((r, i) => (
                      <div className="preview-row" key={i}>
                        <span className="preview-name">
                          {r.name}
                          {r.quantity && <span className="muted"> · {r.quantity}</span>}
                        </span>
                        <span className="preview-kcal">{Math.round(r.calories)} kcal</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}

          <label className="toggle">
            <input
              type="checkbox"
              checked={replaceDays}
              onChange={(e) => setReplaceDays(e.target.checked)}
            />
            <span>Betroffene Tage vor dem Import leeren (vorhandene Mahlzeiten ersetzen)</span>
          </label>

          <button className="primary import-submit" onClick={doImport}>
            {result.rows.length} Einträge importieren
          </button>
        </>
      )}

      {!result.rows.length && !result.errors.length && text.trim() === '' && (
        <p className="empty">Noch nichts eingefügt. Tippe auf „Beispiel einfügen", um es auszuprobieren.</p>
      )}
    </Overlay>
  );
}

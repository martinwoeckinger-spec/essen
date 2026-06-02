import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { dailyBudget, sumNutrients } from '../lib/calc';
import { formatDateLabel, monthLabel, weekdayShort } from '../lib/date';
import { serializeEntries } from '../lib/parse';
import { Card, Overlay } from '../components/ui';
import type { FoodEntry } from '../types';

export default function ArchivePage({ goToToday }: { goToToday: () => void }) {
  const { profile, goal, days } = useStore();
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const setImportOpen = useStore((s) => s.setImportOpen);
  const removeDay = useStore((s) => s.removeDay);
  const [showExport, setShowExport] = useState(false);

  const dayList = useMemo(() => {
    return Object.values(days)
      .filter((d) => d.foods.length > 0 || d.exercises.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((d) => {
        const totals = sumNutrients(d.foods);
        const burned = Math.round(d.exercises.reduce((a, e) => a + (e.calories || 0), 0));
        const budget = dailyBudget(profile, goal, burned);
        return { ...d, totals, budget, over: totals.calories > budget };
      });
  }, [days, profile, goal]);

  // Nach Monat gruppieren (Reihenfolge bleibt absteigend erhalten).
  const groups = useMemo(() => {
    const map = new Map<string, typeof dayList>();
    for (const d of dayList) {
      const label = monthLabel(d.date);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(d);
    }
    return [...map.entries()];
  }, [dayList]);

  function open(date: string) {
    setSelectedDate(date);
    goToToday();
  }

  function del(date: string) {
    if (confirm(`Tag ${formatDateLabel(date)} wirklich aus dem Archiv löschen?`)) removeDay(date);
  }

  const totalDays = dayList.length;
  const totalEntries = dayList.reduce((a, d) => a + d.foods.length, 0);

  return (
    <div className="page">
      <header className="chat-head">
        <h2>Archiv</h2>
        <div className="section-actions">
          <button className="chip" onClick={() => setImportOpen(true)}>
            📋 Import
          </button>
          {totalEntries > 0 && (
            <button className="chip" onClick={() => setShowExport(true)}>
              ⬇ Export
            </button>
          )}
        </div>
      </header>

      {totalDays > 0 && (
        <Card>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value">{totalDays}</div>
              <div className="stat-label">erfasste Tage</div>
            </div>
            <div className="stat">
              <div className="stat-value">{totalEntries}</div>
              <div className="stat-label">Einträge</div>
            </div>
          </div>
        </Card>
      )}

      {totalDays === 0 && (
        <p className="empty">
          Noch keine Tage im Archiv. Importiere deine Tabelle oder erfasse Mahlzeiten unter „Heute".
        </p>
      )}

      {groups.map(([month, list]) => (
        <div key={month}>
          <h3 className="month-head">{month}</h3>
          <Card className="archive-card">
            <ul className="archive-list">
              {list.map((d) => (
                <li key={d.date} className="archive-day">
                  <button className="archive-open" onClick={() => open(d.date)}>
                    <div className="archive-date">
                      <span className="archive-wd">{weekdayShort(d.date)}</span>
                      <span className="archive-label">{formatDateLabel(d.date)}</span>
                    </div>
                    <div className="archive-meta">
                      <span className="muted small">
                        E {d.totals.protein} · KH {d.totals.carbs} · F {d.totals.fat} g · {d.foods.length}{' '}
                        Einträge
                      </span>
                    </div>
                    <div className={`archive-kcal ${d.over ? 'over' : ''}`}>
                      {d.totals.calories}
                      <span className="muted small"> / {d.budget}</span>
                    </div>
                  </button>
                  <button className="del" onClick={() => del(d.date)} aria-label="Tag löschen">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ))}

      {showExport && <ExportOverlay days={days} onClose={() => setShowExport(false)} />}
    </div>
  );
}

function ExportOverlay({
  days,
  onClose,
}: {
  days: Record<string, { date: string; foods: FoodEntry[] }>;
  onClose: () => void;
}) {
  const tsv = useMemo(() => {
    const entries: { date: string; entry: FoodEntry }[] = [];
    for (const day of Object.values(days)) {
      for (const f of day.foods) entries.push({ date: day.date, entry: f });
    }
    entries.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.entry.time.localeCompare(b.entry.time)
    );
    return serializeEntries(entries);
  }, [days]);

  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard ggf. nicht verfügbar – Text ist markierbar. */
    }
  }

  function download() {
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `essen-export-${new Date().toISOString().slice(0, 10)}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Overlay title="Export (Tab-Format)" onClose={onClose}>
      <div className="card">
        <p className="muted small" style={{ marginTop: 0 }}>
          Alle Einträge im selben Format wie der Import – kann gesichert oder wieder eingespielt werden.
        </p>
        <div className="import-actions">
          <button className="chip" onClick={copy}>
            {copied ? '✓ Kopiert' : '📋 Kopieren'}
          </button>
          <button className="chip" onClick={download}>
            ⬇ Als Datei
          </button>
        </div>
        <textarea className="import-text" value={tsv} readOnly rows={12} spellCheck={false} />
      </div>
    </Overlay>
  );
}

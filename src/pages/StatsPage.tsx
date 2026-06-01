import { useState } from 'react';
import { useStore } from '../store/useStore';
import { addDays, todayKey } from '../lib/date';
import { dailyBudget, sumCalories, sumMacros, targetMacros } from '../lib/calc';
import { Card, MacroBar } from '../components/ui';

const RANGES = [7, 14, 30];

export default function StatsPage() {
  const { profile, goal, days } = useStore();
  const [range, setRange] = useState(7);

  const today = todayKey();
  const keys: string[] = [];
  for (let i = range - 1; i >= 0; i--) keys.push(addDays(today, -i));

  const rows = keys.map((k) => {
    const day = days[k] ?? { date: k, foods: [], exercises: [] };
    const burned = Math.round(day.exercises.reduce((a, e) => a + (e.calories || 0), 0));
    const budget = dailyBudget(profile, goal, burned);
    const consumed = sumCalories(day.foods);
    const macros = sumMacros(day.foods);
    return { key: k, budget, consumed, burned, macros, hasData: day.foods.length > 0 };
  });

  const tracked = rows.filter((r) => r.hasData);
  const avgConsumed = tracked.length
    ? Math.round(tracked.reduce((a, r) => a + r.consumed, 0) / tracked.length)
    : 0;
  const avgMacros = {
    protein: tracked.length
      ? Math.round(tracked.reduce((a, r) => a + r.macros.protein, 0) / tracked.length)
      : 0,
    carbs: tracked.length
      ? Math.round(tracked.reduce((a, r) => a + r.macros.carbs, 0) / tracked.length)
      : 0,
    fat: tracked.length
      ? Math.round(tracked.reduce((a, r) => a + r.macros.fat, 0) / tracked.length)
      : 0,
  };
  const avgBudget = rows.length
    ? Math.round(rows.reduce((a, r) => a + r.budget, 0) / rows.length)
    : 0;
  const target = targetMacros(avgBudget, goal);
  const maxVal = Math.max(...rows.map((r) => Math.max(r.budget, r.consumed)), 1);

  return (
    <div className="page">
      <header className="chat-head">
        <h2>Auswertung</h2>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>
              {r} T
            </button>
          ))}
        </div>
      </header>

      <Card>
        <h3 className="card-title">Kalorien pro Tag</h3>
        <div className="chart">
          {rows.map((r) => {
            const h = (r.consumed / maxVal) * 100;
            const budgetH = (r.budget / maxVal) * 100;
            const over = r.consumed > r.budget;
            const label = r.key.slice(8); // Tag
            return (
              <div className="chart-col" key={r.key} title={`${r.consumed} / ${r.budget} kcal`}>
                <div className="chart-bar-wrap">
                  <div
                    className="budget-line"
                    style={{ bottom: `${budgetH}%` }}
                  />
                  <div
                    className={`chart-bar ${over ? 'over' : ''}`}
                    style={{ height: `${Math.min(h, 100)}%` }}
                  />
                </div>
                <div className="chart-label">{label}</div>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          <span><i className="sw accent" /> Gegessen</span>
          <span><i className="sw line" /> Budget</span>
          <span><i className="sw danger" /> Über Budget</span>
        </div>
      </Card>

      <Card>
        <h3 className="card-title">Durchschnitt {tracked.length > 0 ? `(${tracked.length} erfasste Tage)` : ''}</h3>
        <div className="avg-row">
          <span>Ø Kalorien</span>
          <strong>{avgConsumed} kcal</strong>
        </div>
        <div className="spacer" />
        <MacroBar label="Ø Eiweiß" value={avgMacros.protein} target={target.protein} color="var(--protein)" />
        <MacroBar label="Ø Kohlenhydrate" value={avgMacros.carbs} target={target.carbs} color="var(--carbs)" />
        <MacroBar label="Ø Fett" value={avgMacros.fat} target={target.fat} color="var(--fat)" />
      </Card>

      {tracked.length === 0 && (
        <p className="empty">Noch keine Daten im gewählten Zeitraum. Erfasse Mahlzeiten unter „Heute".</p>
      )}
    </div>
  );
}

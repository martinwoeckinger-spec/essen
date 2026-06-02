import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { addDays, todayKey } from '../lib/date';
import { dailyBudget, mealTotals, sumNutrients, targetMacros } from '../lib/calc';
import { Card, DayBars, MacroBar } from '../components/ui';
import { MEALS, MEAL_ORDER } from '../types';
import type { NutrientTotals } from '../types';

const RANGES = [7, 14, 30, 90];

type Metric = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'salt';

const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: 'calories', label: 'Kalorien', unit: ' kcal' },
  { id: 'protein', label: 'Eiweiß', unit: ' g' },
  { id: 'carbs', label: 'KH', unit: ' g' },
  { id: 'fat', label: 'Fett', unit: ' g' },
  { id: 'fiber', label: 'Ballaststoffe', unit: ' g' },
  { id: 'sugar', label: 'Zucker', unit: ' g' },
  { id: 'salt', label: 'Salz', unit: ' g' },
];

const avg = (arr: number[]) =>
  arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

export default function StatsPage() {
  const { profile, goal, days } = useStore();
  const [range, setRange] = useState(7);
  const [metric, setMetric] = useState<Metric>('calories');

  const today = todayKey();

  const rows = useMemo(() => {
    const keys: string[] = [];
    for (let i = range - 1; i >= 0; i--) keys.push(addDays(today, -i));
    return keys.map((k) => {
      const day = days[k] ?? { date: k, foods: [], exercises: [] };
      const burned = Math.round(day.exercises.reduce((a, e) => a + (e.calories || 0), 0));
      const budget = dailyBudget(profile, goal, burned);
      const totals = sumNutrients(day.foods);
      const target = targetMacros(budget, goal);
      const meals = mealTotals(day.foods);
      return { key: k, budget, totals, target, meals, hasData: day.foods.length > 0 };
    });
  }, [days, profile, goal, range, today]);

  const tracked = rows.filter((r) => r.hasData);

  // --- Zeitverlauf der gewählten Kennzahl ---
  const chartData = rows.map((r) => {
    let value = 0;
    let ref: number | undefined;
    let over = false;
    switch (metric) {
      case 'calories':
        value = r.totals.calories;
        ref = r.budget;
        over = value > r.budget;
        break;
      case 'protein':
        value = r.totals.protein;
        ref = r.target.protein;
        break;
      case 'carbs':
        value = r.totals.carbs;
        ref = r.target.carbs;
        break;
      case 'fat':
        value = r.totals.fat;
        ref = r.target.fat;
        break;
      case 'fiber':
        value = r.totals.fiber;
        ref = goal.fiberGoal;
        break;
      case 'sugar':
        value = r.totals.sugar;
        ref = goal.sugarLimit;
        over = value > goal.sugarLimit;
        break;
      case 'salt':
        value = r.totals.salt;
        ref = goal.saltLimit;
        over = value > goal.saltLimit;
        break;
    }
    return { key: r.key, value, ref, over };
  });

  const metricUnit = METRICS.find((m) => m.id === metric)!.unit;
  const trackedValues = chartData.filter((_, i) => rows[i].hasData).map((d) => d.value);
  const metricAvg = avg(trackedValues);

  // Einfache Trendrichtung: ältere vs. neuere Hälfte der erfassten Tage.
  const half = Math.floor(trackedValues.length / 2);
  const trend =
    trackedValues.length >= 4
      ? avg(trackedValues.slice(half)) - avg(trackedValues.slice(0, half))
      : 0;

  // --- Durchschnitte ---
  const avgTotals: NutrientTotals = {
    calories: avg(tracked.map((r) => r.totals.calories)),
    protein: avg(tracked.map((r) => r.totals.protein)),
    carbs: avg(tracked.map((r) => r.totals.carbs)),
    sugar: avg(tracked.map((r) => r.totals.sugar)),
    fat: avg(tracked.map((r) => r.totals.fat)),
    saturatedFat: avg(tracked.map((r) => r.totals.saturatedFat)),
    fiber: avg(tracked.map((r) => r.totals.fiber)),
    salt: avg(tracked.map((r) => r.totals.salt)),
  };
  const avgBudget = Math.round(avg(rows.map((r) => r.budget)));
  const avgTarget = targetMacros(avgBudget, goal);

  // --- Verteilung nach Mahlzeit (Ø kcal über erfasste Tage) ---
  const mealAvg = MEAL_ORDER.map((meal) => ({
    meal,
    kcal: avg(tracked.map((r) => r.meals[meal].calories)),
  }));
  const mealMax = Math.max(...mealAvg.map((m) => m.kcal), 1);

  // --- Tracking-Treue ---
  const withinBudget = tracked.filter((r) => r.totals.calories <= r.budget).length;
  const avgDeviation = tracked.length
    ? Math.round(avg(tracked.map((r) => r.totals.calories - r.budget)))
    : 0;

  // Aktuelle Streak (aufeinanderfolgende erfasste Tage bis heute) – global.
  let streak = 0;
  for (let i = 0; ; i++) {
    const k = addDays(today, -i);
    if ((days[k]?.foods.length ?? 0) > 0) streak++;
    else break;
  }

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
        <h3 className="card-title">Zeitverlauf</h3>
        <div className="metric-chips">
          {METRICS.map((m) => (
            <button
              key={m.id}
              className={`metric-chip ${metric === m.id ? 'on' : ''}`}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <DayBars data={chartData} unit={metricUnit} />
        <div className="chart-legend">
          <span>
            <i className="sw accent" /> Wert
          </span>
          <span>
            <i className="sw line" /> Ziel/Budget
          </span>
          <span>
            <i className="sw danger" /> über Ziel
          </span>
        </div>
        {tracked.length > 0 && (
          <div className="avg-row" style={{ marginTop: 12 }}>
            <span>
              Ø {METRICS.find((m) => m.id === metric)!.label}
              {trackedValues.length >= 4 && (
                <span className="muted small">
                  {' '}
                  {trend > 0 ? '↑ steigend' : trend < 0 ? '↓ fallend' : '→ stabil'}
                </span>
              )}
            </span>
            <strong>
              {metricAvg}
              {metricUnit}
            </strong>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="card-title">
          Durchschnitt {tracked.length > 0 ? `(${tracked.length} erfasste Tage)` : ''}
        </h3>
        <div className="avg-row">
          <span>Ø Kalorien</span>
          <strong>{avgTotals.calories} kcal</strong>
        </div>
        <div className="spacer" />
        <MacroBar label="Ø Eiweiß" value={avgTotals.protein} target={avgTarget.protein} color="var(--protein)" />
        <MacroBar label="Ø Kohlenhydrate" value={avgTotals.carbs} target={avgTarget.carbs} color="var(--carbs)" />
        <MacroBar label="Ø Fett" value={avgTotals.fat} target={avgTarget.fat} color="var(--fat)" />
      </Card>

      <Card>
        <h3 className="card-title">Ø weitere Nährwerte</h3>
        <MacroBar label="Ballaststoffe" value={avgTotals.fiber} target={goal.fiberGoal} color="var(--accent-2)" />
        <MacroBar label="Zucker" value={avgTotals.sugar} target={goal.sugarLimit} color="var(--carbs)" limit />
        <MacroBar label="ges. Fettsäuren" value={avgTotals.saturatedFat} target={goal.satFatLimit} color="var(--fat)" limit />
        <MacroBar label="Salz" value={avgTotals.salt} target={goal.saltLimit} color="var(--muted)" limit />
      </Card>

      <Card>
        <h3 className="card-title">Ø Kalorien nach Mahlzeit</h3>
        {mealAvg.map((m) => (
          <div className="macro" key={m.meal}>
            <div className="macro-head">
              <span className="macro-label">
                {MEALS[m.meal].icon} {MEALS[m.meal].label}
              </span>
              <span className="macro-num">{m.kcal} kcal</span>
            </div>
            <div className="bar">
              <div
                className="bar-fill"
                style={{ width: `${(m.kcal / mealMax) * 100}%`, background: 'var(--accent)' }}
              />
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3 className="card-title">Tracking-Treue</h3>
        <div className="energy-row">
          <span>Erfasste Tage (Zeitraum)</span>
          <strong>
            {tracked.length} / {range}
          </strong>
        </div>
        <div className="energy-row">
          <span>Tage im Budget</span>
          <strong>
            {withinBudget} / {tracked.length || 0}
          </strong>
        </div>
        <div className="energy-row">
          <span>Ø Abweichung vom Budget</span>
          <strong className={avgDeviation > 0 ? 'over' : ''}>
            {avgDeviation > 0 ? '+' : ''}
            {avgDeviation} kcal
          </strong>
        </div>
        <div className="energy-row total">
          <span>🔥 Aktuelle Serie</span>
          <strong>
            {streak} {streak === 1 ? 'Tag' : 'Tage'}
          </strong>
        </div>
      </Card>

      {tracked.length === 0 && (
        <p className="empty">Noch keine Daten im gewählten Zeitraum. Importiere oder erfasse Mahlzeiten.</p>
      )}
    </div>
  );
}

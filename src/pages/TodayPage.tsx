import { useState } from 'react';
import { useStore } from '../store/useStore';
import { addDays, formatDateLabel, formatTime } from '../lib/date';
import {
  bmr,
  dailyBudget,
  maintenance,
  sumCalories,
  sumNutrients,
  targetMacros,
} from '../lib/calc';
import { CalorieRing, Card, MacroBar, Stat } from '../components/ui';
import { MEALS, MEAL_ORDER } from '../types';
import type { ExerciseEntry, FoodEntry, MealType } from '../types';

function defaultMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

export default function TodayPage({ goToChat }: { goToChat: () => void }) {
  const { profile, goal, selectedDate, setSelectedDate, setPendingPrompt } = useStore();
  const day = useStore((s) => s.days[selectedDate]) ?? {
    date: selectedDate,
    foods: [],
    exercises: [],
  };
  const removeFood = useStore((s) => s.removeFood);
  const removeExercise = useStore((s) => s.removeExercise);
  const setImportOpen = useStore((s) => s.setImportOpen);

  const totals = sumNutrients(day.foods);
  const consumed = totals.calories;
  const burned = Math.round(day.exercises.reduce((a, e) => a + (e.calories || 0), 0));
  const budget = dailyBudget(profile, goal, burned);
  const target = targetMacros(budget, goal);
  const remaining = budget - consumed;

  function suggest() {
    setPendingPrompt(
      `Mir fehlen heute noch ${Math.max(remaining, 0)} kcal bis zu meinem Tagesbudget ` +
        `(Eiweiß ${Math.max(target.protein - totals.protein, 0)} g, ` +
        `Kohlenhydrate ${Math.max(target.carbs - totals.carbs, 0)} g, ` +
        `Fett ${Math.max(target.fat - totals.fat, 0)} g übrig). ` +
        `Mach mir 3 konkrete, alltagstaugliche Vorschläge für Mahlzeiten oder Snacks, ` +
        `die gut dazu passen. Trage noch nichts ein.`
    );
    goToChat();
  }

  return (
    <div className="page">
      <header className="datebar">
        <button className="nav-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
          ‹
        </button>
        <div className="datebar-label">{formatDateLabel(selectedDate)}</div>
        <button
          className="nav-btn"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={selectedDate >= new Date().toISOString().slice(0, 10)}
        >
          ›
        </button>
      </header>

      <Card className="hero">
        <CalorieRing consumed={consumed} budget={budget} />
        <div className="hero-stats">
          <Stat label="Budget" value={budget} sub="kcal" />
          <Stat label="Gegessen" value={consumed} sub="kcal" />
          <Stat label="Sport" value={`+${burned}`} sub="kcal" />
        </div>
      </Card>

      <Card>
        <h3 className="card-title">Makronährstoffe</h3>
        <MacroBar label="Eiweiß" value={totals.protein} target={target.protein} color="var(--protein)" />
        <MacroBar label="Kohlenhydrate" value={totals.carbs} target={target.carbs} color="var(--carbs)" />
        <MacroBar label="Fett" value={totals.fat} target={target.fat} color="var(--fat)" />
      </Card>

      <Card>
        <h3 className="card-title">Weitere Nährwerte</h3>
        <MacroBar label="Ballaststoffe" value={totals.fiber} target={goal.fiberGoal} color="var(--accent-2)" />
        <MacroBar label="Zucker" value={totals.sugar} target={goal.sugarLimit} color="var(--carbs)" limit />
        <MacroBar label="ges. Fettsäuren" value={totals.saturatedFat} target={goal.satFatLimit} color="var(--fat)" limit />
        <MacroBar label="Salz" value={totals.salt} target={goal.saltLimit} color="var(--muted)" unit="g" limit />
      </Card>

      <Card className="energy">
        <div className="energy-row">
          <span>Grundumsatz</span>
          <strong>{bmr(profile)} kcal</strong>
        </div>
        <div className="energy-row">
          <span>+ Alltag (Erhaltung)</span>
          <strong>{maintenance(profile)} kcal</strong>
        </div>
        <div className="energy-row">
          <span>+ Sportumsatz heute</span>
          <strong>{burned} kcal</strong>
        </div>
        <div className="energy-row">
          <span>± Ziel-Anpassung</span>
          <strong>
            {goal.adjustment > 0 ? '+' : ''}
            {goal.adjustment} kcal
          </strong>
        </div>
        <div className="energy-row total">
          <span>= Tagesbudget</span>
          <strong>{budget} kcal</strong>
        </div>
      </Card>

      <button className="suggest-btn" onClick={suggest} disabled={remaining <= 0}>
        💡 {remaining > 0 ? `Vorschläge für ${remaining} fehlende kcal` : 'Budget erreicht'}
      </button>

      <FoodSection
        foods={day.foods}
        onRemove={(id) => removeFood(selectedDate, id)}
        onChat={goToChat}
        onImport={() => setImportOpen(true)}
      />
      <ExerciseSection
        exercises={day.exercises}
        onRemove={(id) => removeExercise(selectedDate, id)}
        onChat={goToChat}
      />
    </div>
  );
}

function FoodSection({
  foods,
  onRemove,
  onChat,
  onImport,
}: {
  foods: FoodEntry[];
  onRemove: (id: string) => void;
  onChat: () => void;
  onImport: () => void;
}) {
  const addFood = useStore((s) => s.addFood);
  const date = useStore((s) => s.selectedDate);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <div className="section-head">
        <h3 className="card-title">Mahlzeiten</h3>
        <div className="section-actions">
          <button className="chip" onClick={onImport}>
            📋 Import
          </button>
          <button className="chip" onClick={onChat}>
            💬 Chat
          </button>
          <button className="chip" onClick={() => setOpen((o) => !o)}>
            {open ? '✕' : '+ manuell'}
          </button>
        </div>
      </div>

      {open && (
        <FoodForm
          onSubmit={(f) => {
            addFood(date, f);
            setOpen(false);
          }}
        />
      )}

      {foods.length === 0 && !open && (
        <p className="empty">Noch nichts erfasst. Tippe auf „📋 Import" oder „+ manuell".</p>
      )}

      {MEAL_ORDER.map((meal) => {
        const items = foods.filter((f) => f.meal === meal);
        if (!items.length) return null;
        const kcal = sumCalories(items);
        return (
          <div key={meal} className="meal-group">
            <div className="meal-head">
              <span className="meal-title">
                {MEALS[meal].icon} {MEALS[meal].label}
              </span>
              <span className="meal-kcal">{kcal} kcal</span>
            </div>
            <ul className="entries">
              {items.map((f) => (
                <li key={f.id} className="entry">
                  <div className="entry-main">
                    <span className="entry-name">{f.name}</span>
                    {f.quantity && <span className="entry-qty">{f.quantity}</span>}
                    <span className="entry-macros">
                      E {f.protein} · KH {f.carbs} · F {f.fat} g
                      {f.fiber ? ` · Bst ${f.fiber} g` : ''}
                      {f.source !== 'import' ? ` · ${formatTime(f.time)}` : ''}
                    </span>
                    {f.note && <span className="entry-note">{f.note}</span>}
                  </div>
                  <div className="entry-kcal">{Math.round(f.calories)}</div>
                  <button className="del" onClick={() => onRemove(f.id)} aria-label="Löschen">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </Card>
  );
}

function FoodForm({ onSubmit }: { onSubmit: (f: Omit<FoodEntry, 'id' | 'time'>) => void }) {
  const [name, setName] = useState('');
  const [meal, setMeal] = useState<MealType>(defaultMeal());
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [sugar, setSugar] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [salt, setSalt] = useState('');
  const [note, setNote] = useState('');

  const numDe = (v: string) => Number(v.replace(',', '.')) || 0;

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          meal,
          quantity: quantity.trim() || undefined,
          calories: numDe(calories),
          protein: numDe(protein),
          carbs: numDe(carbs),
          sugar: numDe(sugar),
          fat: numDe(fat),
          saturatedFat: numDe(saturatedFat),
          fiber: numDe(fiber),
          salt: numDe(salt),
          note: note.trim() || undefined,
          source: 'manual',
        });
      }}
    >
      <input placeholder="Was hast du gegessen?" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="form-grid two">
        <select value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
          {MEAL_ORDER.map((m) => (
            <option key={m} value={m}>
              {MEALS[m].icon} {MEALS[m].label}
            </option>
          ))}
        </select>
        <input placeholder="Menge (z.B. 200 g)" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div className="form-grid">
        <LabeledInput label="kcal" value={calories} onChange={setCalories} />
        <LabeledInput label="Eiweiß" value={protein} onChange={setProtein} />
        <LabeledInput label="KH" value={carbs} onChange={setCarbs} />
        <LabeledInput label="Fett" value={fat} onChange={setFat} />
      </div>
      <div className="form-grid">
        <LabeledInput label="Zucker" value={sugar} onChange={setSugar} />
        <LabeledInput label="ges. FS" value={saturatedFat} onChange={setSaturatedFat} />
        <LabeledInput label="Ballast." value={fiber} onChange={setFiber} />
        <LabeledInput label="Salz" value={salt} onChange={setSalt} />
      </div>
      <input placeholder="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="submit" className="primary">
        Hinzufügen
      </button>
    </form>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="mini-field">
      <span>{label}</span>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ExerciseSection({
  exercises,
  onRemove,
  onChat,
}: {
  exercises: ExerciseEntry[];
  onRemove: (id: string) => void;
  onChat: () => void;
}) {
  const addExercise = useStore((s) => s.addExercise);
  const date = useStore((s) => s.selectedDate);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dur, setDur] = useState('');
  const [kcal, setKcal] = useState('');

  return (
    <Card>
      <div className="section-head">
        <h3 className="card-title">Sport</h3>
        <div className="section-actions">
          <button className="chip" onClick={onChat}>
            💬 Chat
          </button>
          <button className="chip" onClick={() => setOpen((o) => !o)}>
            {open ? '✕' : '+ manuell'}
          </button>
        </div>
      </div>

      {open && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addExercise(date, {
              name: name.trim(),
              durationMin: dur ? Number(dur) : undefined,
              calories: Number(kcal) || 0,
            });
            setName('');
            setDur('');
            setKcal('');
            setOpen(false);
          }}
        >
          <input placeholder="Aktivität (z.B. Joggen)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="form-grid two">
            <input inputMode="numeric" placeholder="Minuten" value={dur} onChange={(e) => setDur(e.target.value)} />
            <input inputMode="numeric" placeholder="kcal verbrannt" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </div>
          <button type="submit" className="primary">
            Hinzufügen
          </button>
        </form>
      )}

      {exercises.length === 0 && !open && <p className="empty">Noch kein Sport erfasst.</p>}

      <ul className="entries">
        {exercises.map((e) => (
          <li key={e.id} className="entry">
            <div className="entry-main">
              <span className="entry-name">{e.name}</span>
              <span className="entry-macros">
                {e.durationMin ? `${e.durationMin} min · ` : ''}
                {formatTime(e.time)}
              </span>
            </div>
            <div className="entry-kcal burn">−{Math.round(e.calories)}</div>
            <button className="del" onClick={() => onRemove(e.id)} aria-label="Löschen">
              ×
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

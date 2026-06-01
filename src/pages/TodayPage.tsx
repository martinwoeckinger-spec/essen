import { useState } from 'react';
import { useStore } from '../store/useStore';
import { addDays, formatDateLabel, formatTime } from '../lib/date';
import {
  bmr,
  dailyBudget,
  maintenance,
  sumCalories,
  sumMacros,
  targetMacros,
} from '../lib/calc';
import { CalorieRing, Card, MacroBar, Stat } from '../components/ui';
import type { ExerciseEntry, FoodEntry } from '../types';

export default function TodayPage({ goToChat }: { goToChat: () => void }) {
  const { profile, goal, selectedDate, setSelectedDate, setPendingPrompt } = useStore();
  const day = useStore((s) => s.days[selectedDate]) ?? {
    date: selectedDate,
    foods: [],
    exercises: [],
  };
  const removeFood = useStore((s) => s.removeFood);
  const removeExercise = useStore((s) => s.removeExercise);

  const consumed = sumCalories(day.foods);
  const eaten = sumMacros(day.foods);
  const burned = Math.round(day.exercises.reduce((a, e) => a + (e.calories || 0), 0));
  const budget = dailyBudget(profile, goal, burned);
  const target = targetMacros(budget, goal);
  const remaining = budget - consumed;

  function suggest() {
    setPendingPrompt(
      `Mir fehlen heute noch ${Math.max(remaining, 0)} kcal bis zu meinem Tagesbudget ` +
        `(Eiweiß ${Math.max(target.protein - eaten.protein, 0)} g, ` +
        `Kohlenhydrate ${Math.max(target.carbs - eaten.carbs, 0)} g, ` +
        `Fett ${Math.max(target.fat - eaten.fat, 0)} g übrig). ` +
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
        <MacroBar label="Eiweiß" value={eaten.protein} target={target.protein} color="var(--protein)" />
        <MacroBar label="Kohlenhydrate" value={eaten.carbs} target={target.carbs} color="var(--carbs)" />
        <MacroBar label="Fett" value={eaten.fat} target={target.fat} color="var(--fat)" />
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

      <FoodSection foods={day.foods} onRemove={(id) => removeFood(selectedDate, id)} onChat={goToChat} />
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
}: {
  foods: FoodEntry[];
  onRemove: (id: string) => void;
  onChat: () => void;
}) {
  const addFood = useStore((s) => s.addFood);
  const date = useStore((s) => s.selectedDate);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <div className="section-head">
        <h3 className="card-title">Mahlzeiten</h3>
        <div className="section-actions">
          <button className="chip" onClick={onChat}>
            💬 per Chat
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

      {foods.length === 0 && !open && <p className="empty">Noch nichts erfasst.</p>}

      <ul className="entries">
        {foods.map((f) => (
          <li key={f.id} className="entry">
            <div className="entry-main">
              <span className="entry-name">{f.name}</span>
              {f.quantity && <span className="entry-qty">{f.quantity}</span>}
              <span className="entry-macros">
                E {f.protein} · KH {f.carbs} · F {f.fat} g · {formatTime(f.time)}
              </span>
            </div>
            <div className="entry-kcal">{Math.round(f.calories)}</div>
            <button className="del" onClick={() => onRemove(f.id)} aria-label="Löschen">
              ×
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FoodForm({ onSubmit }: { onSubmit: (f: Omit<FoodEntry, 'id' | 'time'>) => void }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          quantity: quantity.trim() || undefined,
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fat: Number(fat) || 0,
        });
      }}
    >
      <input placeholder="Was hast du gegessen?" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Menge (z.B. 200 g)" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <div className="form-grid">
        <input inputMode="numeric" placeholder="kcal" value={calories} onChange={(e) => setCalories(e.target.value)} />
        <input inputMode="numeric" placeholder="Eiweiß g" value={protein} onChange={(e) => setProtein(e.target.value)} />
        <input inputMode="numeric" placeholder="KH g" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        <input inputMode="numeric" placeholder="Fett g" value={fat} onChange={(e) => setFat(e.target.value)} />
      </div>
      <button type="submit" className="primary">
        Hinzufügen
      </button>
    </form>
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
            💬 per Chat
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

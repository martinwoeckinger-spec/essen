import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ACTIVITY_LABELS, bmr, maintenance, targetMacros } from '../lib/calc';
import { Card, Stat } from '../components/ui';
import type { ActivityLevel, GoalMode, Sex } from '../types';

const GOAL_PRESETS: { mode: GoalMode; label: string; adjustment: number }[] = [
  { mode: 'lose', label: 'Abnehmen (−500)', adjustment: -500 },
  { mode: 'lose', label: 'Leicht abnehmen (−300)', adjustment: -300 },
  { mode: 'maintain', label: 'Halten (±0)', adjustment: 0 },
  { mode: 'gain', label: 'Aufbauen (+300)', adjustment: 300 },
  { mode: 'gain', label: 'Aufbauen (+500)', adjustment: 500 },
];

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 – schnell & günstig' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 – ausgewogen (empfohlen)' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8 – höchste Qualität' },
];

export default function ProfilePage() {
  const { profile, goal, settings, setProfile, setGoal, setSettings } = useStore();
  const [showKey, setShowKey] = useState(false);

  const target = targetMacros(maintenance(profile) + goal.adjustment, goal);

  function setMacroPct(key: 'proteinPct' | 'carbsPct' | 'fatPct', val: number) {
    setGoal({ [key]: val } as any);
  }
  const macroSum = goal.proteinPct + goal.carbsPct + goal.fatPct;

  return (
    <div className="page">
      <header className="chat-head">
        <h2>Profil &amp; Ziele</h2>
      </header>

      <Card>
        <div className="hero-stats three">
          <Stat label="Grundumsatz" value={bmr(profile)} sub="kcal/Tag" />
          <Stat label="Erhaltung" value={maintenance(profile)} sub="kcal/Tag" />
          <Stat label="Budget-Ziel" value={maintenance(profile) + goal.adjustment} sub="kcal/Tag" />
        </div>
      </Card>

      <Card>
        <h3 className="card-title">Körperdaten</h3>
        <div className="field">
          <label>Geschlecht</label>
          <div className="seg full">
            {(['male', 'female'] as Sex[]).map((s) => (
              <button key={s} className={profile.sex === s ? 'on' : ''} onClick={() => setProfile({ sex: s })}>
                {s === 'male' ? 'Männlich' : 'Weiblich'}
              </button>
            ))}
          </div>
        </div>
        <div className="field-grid">
          <NumberField label="Alter" value={profile.age} onChange={(v) => setProfile({ age: v })} suffix="J" />
          <NumberField label="Größe" value={profile.height} onChange={(v) => setProfile({ height: v })} suffix="cm" />
          <NumberField label="Gewicht" value={profile.weight} onChange={(v) => setProfile({ weight: v })} suffix="kg" />
        </div>
        <div className="field">
          <label>Alltagsaktivität (ohne Sport)</label>
          <select
            value={profile.activity}
            onChange={(e) => setProfile({ activity: e.target.value as ActivityLevel })}
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <h3 className="card-title">Ziel</h3>
        <div className="presets">
          {GOAL_PRESETS.map((p) => (
            <button
              key={p.label}
              className={`preset ${goal.adjustment === p.adjustment && goal.mode === p.mode ? 'on' : ''}`}
              onClick={() => setGoal({ mode: p.mode, adjustment: p.adjustment })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={goal.addExerciseToBudget}
            onChange={(e) => setGoal({ addExerciseToBudget: e.target.checked })}
          />
          <span>Verbrannte Sportkalorien zum Tagesbudget addieren</span>
        </label>
      </Card>

      <Card>
        <h3 className="card-title">Makro-Verteilung</h3>
        <p className={`muted small ${macroSum !== 100 ? 'warn' : ''}`}>
          Summe: {macroSum}% {macroSum !== 100 ? '(sollte 100% ergeben)' : '✓'}
        </p>
        <PctField label="Eiweiß" value={goal.proteinPct} grams={target.protein} color="var(--protein)" onChange={(v) => setMacroPct('proteinPct', v)} />
        <PctField label="Kohlenhydrate" value={goal.carbsPct} grams={target.carbs} color="var(--carbs)" onChange={(v) => setMacroPct('carbsPct', v)} />
        <PctField label="Fett" value={goal.fatPct} grams={target.fat} color="var(--fat)" onChange={(v) => setMacroPct('fatPct', v)} />
      </Card>

      <Card>
        <h3 className="card-title">KI-Chat (Anthropic)</h3>
        <p className="muted small">
          Dein API-Key wird nur lokal auf diesem Gerät gespeichert und direkt an Anthropic gesendet.
          Schlüssel erstellen unter console.anthropic.com.
        </p>
        <div className="field">
          <label>API-Key</label>
          <div className="key-row">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-…"
              value={settings.apiKey}
              onChange={(e) => setSettings({ apiKey: e.target.value.trim() })}
              autoComplete="off"
            />
            <button className="chip" onClick={() => setShowKey((s) => !s)}>
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div className="field">
          <label>Modell</label>
          <select value={settings.model} onChange={(e) => setSettings({ model: e.target.value })}>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <p className="footer-note">
        Alle Daten bleiben lokal in diesem Browser (offline-fähig). App zum Startbildschirm hinzufügen,
        um sie wie eine native App zu nutzen.
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="num-suffix">
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        {suffix && <span>{suffix}</span>}
      </div>
    </div>
  );
}

function PctField({
  label,
  value,
  grams,
  color,
  onChange,
}: {
  label: string;
  value: number;
  grams: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="pct">
      <div className="pct-head">
        <span style={{ color }}>● {label}</span>
        <span className="muted">
          {value}% · {grams} g
        </span>
      </div>
      <input type="range" min={0} max={100} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

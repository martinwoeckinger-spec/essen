import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { runChat } from '../lib/claude';
import type { ExerciseToolInput, FoodToolInput } from '../lib/claude';
import {
  DIET_LABELS,
  bmr,
  dailyBudget,
  maintenance,
  sumNutrients,
  targetMacros,
} from '../lib/calc';
import { formatDateLabel } from '../lib/date';
import { MEALS } from '../types';
import type { MealType } from '../types';

const isDateKey = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default function ChatPage({ goToProfile }: { goToProfile: () => void }) {
  const { profile, goal, settings, selectedDate } = useStore();
  const chat = useStore((s) => s.chat);
  const pushChat = useStore((s) => s.pushChat);
  const clearChat = useStore((s) => s.clearChat);
  const addFood = useStore((s) => s.addFood);
  const addExercise = useStore((s) => s.addExercise);
  const pendingPrompt = useStore((s) => s.pendingPrompt);
  const setPendingPrompt = useStore((s) => s.setPendingPrompt);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat, busy]);

  function buildSystem(): string {
    const s = useStore.getState();
    const day = s.days[selectedDate] ?? { date: selectedDate, foods: [], exercises: [] };
    const burned = Math.round(day.exercises.reduce((a, e) => a + (e.calories || 0), 0));
    const budget = dailyBudget(profile, goal, burned);
    const t = sumNutrients(day.foods);
    const target = targetMacros(budget, goal);
    const name = profile.name?.trim();
    return [
      'Du bist der Ernährungs-Assistent der App "Essen", ein Kalorien- und Makrotracker.',
      'Antworte kurz, freundlich und auf Deutsch. Verwende metrische Einheiten (g, kcal).',
      'Wenn der Nutzer beschreibt, was er gegessen oder an Sport gemacht hat, trage es mit den ' +
        'passenden Tools (add_food / add_exercise) ein und bestätige danach knapp, was du erfasst hast.',
      'Ordne jedem Lebensmittel eine Mahlzeit zu (breakfast/lunch/dinner/snack) und schätze fehlende ' +
        'Nährwerte realistisch – inkl. Zucker, gesättigten Fettsäuren, Ballaststoffen und Salz. ' +
        'Frage nur nach, wenn die Angabe wirklich unklar ist.',
      'Berücksichtige bei Vorschlägen die Vorlieben/Abneigungen und den Ernährungsstil des Nutzers.',
      '',
      name ? `Der Nutzer heißt ${name}.` : '',
      `Aktueller Tag: ${formatDateLabel(selectedDate)} (${selectedDate}). Für andere Tage date=YYYY-MM-DD setzen.`,
      `Profil: ${profile.sex === 'male' ? 'männlich' : 'weiblich'}, ${profile.age} Jahre, ` +
        `${profile.height} cm, ${profile.weight} kg` +
        (profile.targetWeight ? `, Wunschgewicht ${profile.targetWeight} kg` : '') +
        '.',
      `Ernährungsstil: ${DIET_LABELS[goal.dietStyle]}.`,
      goal.preferences?.trim() ? `Vorlieben/Hinweise: ${goal.preferences.trim()}` : '',
      `Grundumsatz: ${bmr(profile)} kcal, Erhaltungsbedarf: ${maintenance(profile)} kcal.`,
      `Tagesbudget: ${budget} kcal. Bereits gegessen: ${t.calories} kcal ` +
        `(Eiweiß ${t.protein} g, KH ${t.carbs} g, Fett ${t.fat} g, Ballaststoffe ${t.fiber} g, ` +
        `Zucker ${t.sugar} g, Salz ${t.salt} g).`,
      `Ziel-Makros: Eiweiß ${target.protein} g, KH ${target.carbs} g, Fett ${target.fat} g. ` +
        `Ballaststoff-Ziel ${goal.fiberGoal} g; Limits: Zucker ${goal.sugarLimit} g, ` +
        `Salz ${goal.saltLimit} g, ges. FS ${goal.satFatLimit} g.`,
      `Restbudget: ${budget - t.calories} kcal.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  function makeHandlers() {
    return {
      addFood: (f: FoodToolInput) => {
        const date = isDateKey(f.date) ? f.date : selectedDate;
        const meal: MealType = f.meal ?? 'snack';
        addFood(date, {
          name: f.name,
          meal,
          quantity: f.quantity,
          calories: Math.round(f.calories),
          protein: Math.round(f.protein),
          carbs: Math.round(f.carbs),
          sugar: Math.round(f.sugar ?? 0),
          fat: Math.round(f.fat),
          saturatedFat: Math.round(f.saturatedFat ?? 0),
          fiber: Math.round(f.fiber ?? 0),
          salt: Math.round((f.salt ?? 0) * 10) / 10,
          note: f.note,
          source: 'chat',
        });
        return `Eingetragen: ${f.name} (${MEALS[meal].label}, ${Math.round(f.calories)} kcal, E ${Math.round(
          f.protein
        )} / KH ${Math.round(f.carbs)} / F ${Math.round(f.fat)} g).`;
      },
      addExercise: (e: ExerciseToolInput) => {
        const date = isDateKey(e.date) ? e.date : selectedDate;
        addExercise(date, {
          name: e.name,
          durationMin: e.durationMin,
          calories: Math.round(e.calories),
        });
        return `Sport eingetragen: ${e.name}, ${Math.round(e.calories)} kcal verbrannt.`;
      },
      getSummary: () => buildSystem(),
    };
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);

    if (!settings.apiKey) {
      setError('Kein API-Key hinterlegt. Bitte im Profil eintragen.');
      return;
    }

    const history = useStore.getState().chat.map((m) => ({ role: m.role, content: m.content }));
    pushChat({ role: 'user', content: trimmed, ts: new Date().toISOString() });
    setInput('');
    setBusy(true);

    try {
      const reply = await runChat({
        apiKey: settings.apiKey,
        model: settings.model,
        system: buildSystem(),
        history,
        userMessage: trimmed,
        handlers: makeHandlers(),
      });
      pushChat({ role: 'assistant', content: reply, ts: new Date().toISOString() });
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(`Fehler bei der KI-Anfrage: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  // Vom "Vorschläge"-Button gesetzte Aufforderung automatisch senden.
  useEffect(() => {
    if (pendingPrompt) {
      const p = pendingPrompt;
      setPendingPrompt(null);
      void send(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  return (
    <div className="page chat-page">
      <header className="chat-head">
        <div>
          <h2>KI-Chat</h2>
          <span className="muted small">Tag: {formatDateLabel(selectedDate)}</span>
        </div>
        {chat.length > 0 && (
          <button className="chip" onClick={clearChat}>
            Verlauf leeren
          </button>
        )}
      </header>

      {!settings.apiKey && (
        <div className="banner" onClick={goToProfile} role="button">
          🔑 Noch kein Anthropic-API-Key hinterlegt. Tippe hier, um ihn im Profil einzutragen.
        </div>
      )}

      <div className="messages" ref={scrollRef}>
        {chat.length === 0 && (
          <div className="chat-intro">
            <p>Erzähl mir einfach, was du gegessen hast – ich trage es ein. Zum Beispiel:</p>
            <div className="examples">
              {[
                '2 Scheiben Vollkornbrot mit Käse und Butter',
                'Eine Banane und ein Kaffee mit Milch',
                '30 Minuten joggen',
                'Was kann ich noch essen, um auf mein Eiweißziel zu kommen?',
              ].map((ex) => (
                <button key={ex} className="example" onClick={() => send(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content}
          </div>
        ))}

        {busy && (
          <div className="msg assistant typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          placeholder="Nachricht schreiben…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="send" disabled={busy || !input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}

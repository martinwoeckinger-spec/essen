import Anthropic from '@anthropic-ai/sdk';

export interface FoodToolInput {
  name: string;
  quantity?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ExerciseToolInput {
  name: string;
  durationMin?: number;
  calories: number;
}

export interface ToolHandlers {
  addFood: (input: FoodToolInput) => string;
  addExercise: (input: ExerciseToolInput) => string;
  getSummary: () => string;
}

export interface RunChatOptions {
  apiKey: string;
  model: string;
  system: string;
  /** Bisheriger Verlauf als einfache Text-Nachrichten. */
  history: { role: 'user' | 'assistant'; content: string }[];
  /** Neue Nutzereingabe. */
  userMessage: string;
  handlers: ToolHandlers;
}

const tools = [
  {
    name: 'add_food',
    description:
      'Trägt ein gegessenes Lebensmittel bzw. eine Mahlzeit in das Tagebuch des aktuell ausgewählten Tages ein. ' +
      'Wenn der Nutzer keine genauen Nährwerte nennt, schätze realistische Werte anhand üblicher Portionsgrößen. ' +
      'Lege für jedes einzelne Lebensmittel einen eigenen Eintrag an.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name des Lebensmittels / der Mahlzeit' },
        quantity: { type: 'string', description: 'Menge, z.B. "200 g" oder "1 Portion"' },
        calories: { type: 'number', description: 'Kalorien in kcal' },
        protein: { type: 'number', description: 'Eiweiß in Gramm' },
        carbs: { type: 'number', description: 'Kohlenhydrate in Gramm' },
        fat: { type: 'number', description: 'Fett in Gramm' },
      },
      required: ['name', 'calories', 'protein', 'carbs', 'fat'],
    },
  },
  {
    name: 'add_exercise',
    description:
      'Trägt eine sportliche Aktivität (Sportumsatz) in das Tagebuch des ausgewählten Tages ein. ' +
      'Schätze die verbrannten Kalorien realistisch, falls nicht angegeben.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Art der Aktivität, z.B. "Joggen"' },
        durationMin: { type: 'number', description: 'Dauer in Minuten' },
        calories: { type: 'number', description: 'Verbrannte Kalorien in kcal' },
      },
      required: ['name', 'calories'],
    },
  },
  {
    name: 'get_day_summary',
    description:
      'Liefert das aktuelle Tagesbudget, die bereits gegessenen Kalorien/Makros sowie das Restbudget ' +
      'des ausgewählten Tages. Nutze dies, bevor du Vorschläge für fehlende Kalorien machst.',
    input_schema: { type: 'object', properties: {} },
  },
];

/**
 * Führt eine Chat-Anfrage inkl. Tool-Use-Schleife aus und gibt den finalen
 * Antworttext zurück. Tools werden über die übergebenen Handler ausgeführt.
 */
export async function runChat(opts: RunChatOptions): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true });

  const messages: any[] = [
    ...opts.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: opts.userMessage },
  ];

  let finalText = '';

  for (let step = 0; step < 8; step++) {
    const res = await client.messages.create({
      model: opts.model,
      max_tokens: 1500,
      system: opts.system,
      tools: tools as any,
      messages,
    });

    const text = res.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim();
    if (text) finalText = text;

    if (res.stop_reason !== 'tool_use') break;

    const toolUses = res.content.filter((b: any) => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: res.content });

    const results = toolUses.map((tu: any) => {
      let out: string;
      try {
        if (tu.name === 'add_food') out = opts.handlers.addFood(tu.input as FoodToolInput);
        else if (tu.name === 'add_exercise')
          out = opts.handlers.addExercise(tu.input as ExerciseToolInput);
        else if (tu.name === 'get_day_summary') out = opts.handlers.getSummary();
        else out = `Unbekanntes Tool: ${tu.name}`;
      } catch (e) {
        out = `Fehler bei ${tu.name}: ${String(e)}`;
      }
      return { type: 'tool_result', tool_use_id: tu.id, content: out };
    });

    messages.push({ role: 'user', content: results });
  }

  return finalText || 'Erledigt.';
}

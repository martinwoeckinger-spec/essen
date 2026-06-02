import type { ReactNode } from 'react';

/** Kalorien-Ring: zeigt verbraucht/Budget mit Restwert in der Mitte. */
export function CalorieRing({
  consumed,
  budget,
}: {
  consumed: number;
  budget: number;
}) {
  const size = 200;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = budget > 0 ? Math.min(consumed / budget, 1) : 0;
  const over = consumed > budget;
  const remaining = budget - consumed;

  return (
    <div className="ring-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'var(--danger)' : 'var(--accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <div className={`ring-value ${over ? 'over' : ''}`}>{Math.abs(remaining)}</div>
        <div className="ring-label">{over ? 'kcal drüber' : 'kcal übrig'}</div>
      </div>
    </div>
  );
}

/**
 * Fortschritts-/Ziel-Balken.
 * - `limit=false` (Ziel): voller Balken ist gut.
 * - `limit=true` (Obergrenze, z.B. Zucker/Salz): Überschreiten wird rot.
 */
export function MacroBar({
  label,
  value,
  target,
  color,
  unit = 'g',
  limit = false,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
  limit?: boolean;
}) {
  const frac = target > 0 ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target;
  const fill = limit && over ? 'var(--danger)' : color;
  return (
    <div className="macro">
      <div className="macro-head">
        <span className="macro-label">{label}</span>
        <span className="macro-num">
          {value}
          <span className="muted">
            {' '}
            {limit ? 'max.' : '/'} {target} {unit}
          </span>
          {limit && over && <span className="warn-tag"> ⚠</span>}
        </span>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${frac * 100}%`, background: fill }} />
      </div>
    </div>
  );
}

/** Generisches Tagesbalken-Diagramm (Zeitverlauf einer Kennzahl). */
export function DayBars({
  data,
  unit = '',
}: {
  data: { key: string; value: number; ref?: number; over?: boolean }[];
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.ref ?? 0)), 1);
  return (
    <div className="chart">
      {data.map((d) => {
        const h = (d.value / max) * 100;
        const refH = d.ref != null ? (d.ref / max) * 100 : null;
        return (
          <div
            className="chart-col"
            key={d.key}
            title={`${d.key}: ${d.value}${unit}${d.ref != null ? ` (Ziel ${d.ref}${unit})` : ''}`}
          >
            <div className="chart-bar-wrap">
              {refH != null && <div className="budget-line" style={{ bottom: `${Math.min(refH, 100)}%` }} />}
              <div
                className={`chart-bar ${d.over ? 'over' : ''}`}
                style={{ height: `${Math.min(h, 100)}%` }}
              />
            </div>
            <div className="chart-label">{d.key.slice(8)}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Vollflächiges Overlay (für den strukturierten Import). */
export function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlay-head">
        <h2>{title}</h2>
        <button className="chip" onClick={onClose}>
          ✕ Schließen
        </button>
      </div>
      <div className="overlay-body">{children}</div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

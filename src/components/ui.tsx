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

/** Makro-Balken mit Ziel-Markierung. */
export function MacroBar({
  label,
  value,
  target,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const frac = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <div className="macro">
      <div className="macro-head">
        <span className="macro-label">{label}</span>
        <span className="macro-num">
          {value}
          <span className="muted">
            {' '}
            / {target} {unit}
          </span>
        </span>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${frac * 100}%`, background: color }} />
      </div>
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

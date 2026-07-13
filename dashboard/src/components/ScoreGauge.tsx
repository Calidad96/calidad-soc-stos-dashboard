'use client';

export function scoreGaugeColor(value: number | null): string {
  if (value == null) return 'var(--muted)';
  if (value >= 4) return 'var(--green)';
  if (value >= 2.5) return 'var(--amber)';
  return 'var(--red)';
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  fromAngle: number,
  toAngle: number
): string {
  const point = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });
  const from = point(fromAngle);
  const to = point(toAngle);
  return `M ${from.x} ${from.y} A ${r} ${r} 0 0 1 ${to.x} ${to.y}`;
}

export function ScoreGauge({
  value,
  size = 72,
}: {
  value: number | null;
  size?: number;
}) {
  const score = value != null ? Math.min(5, Math.max(0, value)) : null;
  const pct = score != null ? score / 5 : 0;
  const gaugeColor = scoreGaugeColor(score);

  const cx = 50;
  const cy = 54;
  const r = 36;
  const left = Math.PI;
  const right = 0;
  const needle = Math.PI * (1 - pct);

  const polar = (angle: number, radius = r) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  const current = polar(needle);

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = Math.PI - (Math.PI * i) / 10;
    const isMajor = i % 2 === 0;
    const inner = polar(angle, r - (isMajor ? 9 : 5));
    const outer = polar(angle, r + 2);
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, isMajor };
  });

  const trackPath = arcPath(cx, cy, r, left, right);
  const valuePath = score != null && pct > 0 ? arcPath(cx, cy, r, left, needle) : '';

  const height = size * 0.55;

  return (
    <div
      className="score-gauge shrink-0"
      style={{ width: size, height }}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 58"
        width={size}
        height={height}
        style={{ overflow: 'visible' }}
      >
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="var(--muted)"
            strokeWidth={t.isMajor ? 1.2 : 0.7}
            strokeLinecap="round"
            opacity={t.isMajor ? 0.5 : 0.28}
          />
        ))}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
          strokeLinecap="butt"
        />
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="6"
            strokeLinecap="butt"
            className="transition-all duration-700 ease-out"
          />
        )}
        <circle cx={cx} cy={cy} r="2.5" fill="var(--border)" />
        {score != null && pct > 0 && (
          <circle
            cx={current.x}
            cy={current.y}
            r="3.5"
            fill={gaugeColor}
            stroke="var(--card)"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </div>
  );
}

'use client';

import { useId } from 'react';

type Accent = 'royal' | 'gold' | 'green' | 'red' | 'amber';

const strokeColors: Record<Accent, string> = {
  royal: 'var(--royal)',
  gold: 'var(--gold)',
  green: 'var(--green)',
  red: 'var(--red)',
  amber: 'var(--amber)',
};

export function Sparkline({
  data,
  accent = 'royal',
  width = 80,
  height = 28,
}: {
  data: number[];
  accent?: Accent;
  width?: number;
  height?: number;
}) {
  const gradId = `spark-${useId().replace(/:/g, '')}`;
  const values = data.filter((v) => Number.isFinite(v));
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  });

  const last = values.at(-1) ?? 0;
  const first = values[0] ?? 0;
  const trend = last >= first ? 'up' : 'down';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 opacity-90"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColors[accent]} stopOpacity="0.28" />
          <stop offset="100%" stopColor={strokeColors[accent]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${height - pad} ${points.join(' ')} ${width - pad},${height - pad}`}
        fill={`url(#${gradId})`}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColors[accent]}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points.at(-1)?.split(',')[0]}
        cy={points.at(-1)?.split(',')[1]}
        r="2.25"
        fill={strokeColors[accent]}
        className={trend === 'up' ? 'opacity-100' : 'opacity-80'}
      />
    </svg>
  );
}

const TONE_CLASS = {
  good: 'status-good',
  warn: 'status-warn',
  bad: 'status-bad',
  royal: 'status-royal',
  neutral: 'status-neutral',
} as const;

export function StatusTag({
  label,
  tone = 'neutral',
  title,
}: {
  label: string;
  tone?: keyof typeof TONE_CLASS;
  /** Tooltip when label is truncated */
  title?: string;
}) {
  const text = label || '—';
  return (
    <span
      className={`status-tag ${TONE_CLASS[tone]}`}
      title={title ?? text}
    >
      {text}
    </span>
  );
}

export function priorityTone(priority: string): keyof typeof TONE_CLASS {
  const p = priority.toLowerCase();
  if (p.includes('critical') || p.includes('p0')) return 'bad';
  if (p.includes('high') || p.includes('p1')) return 'warn';
  if (p.includes('medium') || p.includes('p2')) return 'royal';
  return 'neutral';
}

export function statusTone(status: string): keyof typeof TONE_CLASS {
  const s = status.toLowerCase();
  if (/done|complete|closed|resolved|active|on track|setup/.test(s)) return 'good';
  if (/progress|working|pending|review/.test(s)) return 'warn';
  if (/overdue|critical|inactive|blocked|not started/.test(s)) return 'bad';
  return 'neutral';
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const idx = parseInt(m ?? '', 10) - 1;
  if (idx >= 0 && idx < 12) return `${MONTH_SHORT[idx]} ${y}`;
  return ym;
}

/** MM/YYYY — no day (KPI data is monthly) */
export function formatMonthCompact(ym: string): string {
  const [y, m] = ym.split('-');
  if (!y || !m) return ym;
  return `${m}/${y}`;
}

/** Short label for charts — e.g. Jan '26 */
export function formatMonthChart(ym: string): string {
  const [y, m] = ym.split('-');
  const idx = parseInt(m ?? '', 10) - 1;
  if (idx >= 0 && idx < 12) return `${MONTH_SHORT[idx]} '${y?.slice(2) ?? ''}`;
  return ym;
}

export function formatPeriodRange(from: string, to: string): string {
  if (!from || !to) return 'Select period';
  if (from === to) return formatMonth(from);
  return `${formatMonth(from)} – ${formatMonth(to)}`;
}

export interface PeriodPreset {
  id: string;
  label: string;
  short: string;
  from: string;
  to: string;
}

export function availableYears(months: string[]): string[] {
  return [...new Set(months.map((m) => m.split('-')[0]))].sort();
}

export function monthKey(year: string, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function hasMonthData(months: string[], ym: string): boolean {
  return months.includes(ym);
}

export function buildPeriodPresets(months: string[]): PeriodPreset[] {
  if (!months.length) return [];

  const sorted = [...months].sort();
  const latest = sorted.at(-1)!;
  const earliest = sorted[0]!;
  const year = latest.split('-')[0];
  const ytdStart = sorted.find((m) => m >= `${year}-01`) ?? earliest;

  const lastN = (n: number) => {
    const endIdx = sorted.indexOf(latest);
    const startIdx = Math.max(0, endIdx - n + 1);
    return { from: sorted[startIdx], to: latest };
  };

  const three = lastN(3);
  const six = lastN(6);

  return [
    { id: '3m', label: 'Last 3 months of KPI data', short: '3M', ...three },
    { id: '6m', label: 'Last 6 months of KPI data', short: '6M', ...six },
    {
      id: 'ytd',
      label: 'This year — January through latest month',
      short: 'YTD',
      from: ytdStart,
      to: latest,
    },
    {
      id: 'all',
      label: 'All available months with KPI data',
      short: 'All',
      from: earliest,
      to: latest,
    },
  ];
}

export function inlinePresets(months: string[]): PeriodPreset[] {
  return buildPeriodPresets(months);
}

export function activePresetId(
  presets: PeriodPreset[],
  from: string,
  to: string
): string | null {
  const match = presets.find((p) => p.from === from && p.to === to);
  return match?.id ?? null;
}

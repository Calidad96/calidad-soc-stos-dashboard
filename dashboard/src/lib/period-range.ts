export interface PeriodRange {
  from: string;
  to: string;
}

/** Normalize and validate a month range against available months */
export function resolvePeriodRange(
  months: string[],
  from?: string | null,
  to?: string | null
): PeriodRange | null {
  if (!months.length) return null;

  const sorted = [...months].sort();
  const latest = sorted.at(-1)!;

  let end = to && sorted.includes(to) ? to : latest;
  let start = from && sorted.includes(from) ? from : end;

  if (start > end) [start, end] = [end, start];

  return { from: start, to: end };
}

export function periodLabel(range: PeriodRange | null): string | null {
  if (!range) return null;
  return range.from === range.to ? range.to : `${range.from} → ${range.to}`;
}

export function monthsInRange(months: string[], range: PeriodRange | null): string[] {
  if (!range) return months;
  return months.filter((m) => m >= range.from && m <= range.to);
}

import { computeScore } from './metrics';
import type { KpiRecord } from './types';

export function lastMonths(months: string[], limit = 8): string[] {
  return months.slice(-limit);
}

/** Monthly average KPI score (0–5) across all tracked metrics. */
export function monthlyKpiAvgSeries(
  kpis: KpiRecord[],
  months: string[],
  limit = 8
): number[] {
  const periods = lastMonths(months, limit);
  return periods.map((period) => {
    const scores: number[] = [];
    for (const k of kpis) {
      const point = k.monthly.find((m) => m.period === period);
      if (point == null) continue;
      const score = computeScore(point.value, k.target, k.exceed);
      if (score != null) scores.push(score);
    }
    if (!scores.length) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  });
}

/** Monthly average for a department (SOC / STOS). */
export function monthlyDeptAvgSeries(
  kpis: KpiRecord[],
  months: string[],
  department: string,
  limit = 8
): number[] {
  const deptKpis = kpis.filter((k) =>
    k.department.toLowerCase().includes(department.toLowerCase())
  );
  return monthlyKpiAvgSeries(deptKpis, months, limit);
}

/** Monthly count of KPIs scoring at or above 4.0. */
export function monthlyOnTargetSeries(
  kpis: KpiRecord[],
  months: string[],
  limit = 8
): number[] {
  const periods = lastMonths(months, limit);
  return periods.map((period) => {
    let count = 0;
    for (const k of kpis) {
      const point = k.monthly.find((m) => m.period === period);
      if (point == null) continue;
      const score = computeScore(point.value, k.target, k.exceed);
      if (score != null && score >= 4) count += 1;
    }
    return count;
  });
}

export interface MonthlyTrendPoint {
  period: string;
  label: string;
  teamAvg: number | null;
  socAvg: number | null;
  stosAvg: number | null;
  onTarget: number;
}

function avgScoreForPeriod(
  kpis: KpiRecord[],
  period: string,
  dept?: string
): number | null {
  const filtered = dept
    ? kpis.filter((k) => k.department.toLowerCase().includes(dept.toLowerCase()))
    : kpis;
  const scores: number[] = [];
  for (const k of filtered) {
    const point = k.monthly.find((m) => m.period === period);
    if (point == null) continue;
    const score = computeScore(point.value, k.target, k.exceed);
    if (score != null) scores.push(score);
  }
  if (!scores.length) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

/** Chart-ready monthly team / department averages (uses all stored months). */
export function buildMonthlyTrendPoints(
  kpis: KpiRecord[],
  months: string[],
  limit = 12
): MonthlyTrendPoint[] {
  const periods = lastMonths(months, limit);
  return periods.map((period) => ({
    period,
    label: period,
    teamAvg: avgScoreForPeriod(kpis, period),
    socAvg: avgScoreForPeriod(kpis, period, 'SOC'),
    stosAvg: avgScoreForPeriod(kpis, period, 'STOS'),
    onTarget: monthlyOnTargetSeries(kpis, [period], 1)[0],
  }));
}

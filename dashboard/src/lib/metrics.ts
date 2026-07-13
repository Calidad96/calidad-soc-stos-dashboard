import type { KpiRecord } from './types';

export function computeScore(
  actual: number | null,
  target: number | null,
  exceed: string
): number | null {
  if (actual == null || target == null) return null;
  if (actual === target) return 5;
  const ex = exceed?.toLowerCase() ?? '';
  if (ex.includes('low') && actual === 0) return 5;
  if (ex.includes('low') && target === 0) return actual <= 0 ? 5 : 0;
  const ratio = ex.includes('high') ? actual / target : target / actual;
  return Math.max(0, Math.min(5, ratio * 5));
}

export function ytdAverage(monthly: { period: string; value: number }[]): number | null {
  if (!monthly.length) return null;
  const sum = monthly.reduce((a, m) => a + m.value, 0);
  return sum / monthly.length;
}

export function kpiScore(kpi: KpiRecord): number | null {
  const ytd = ytdAverage(kpi.monthly);
  return computeScore(ytd, kpi.target, kpi.exceed);
}

export function scoreColor(score: number | null): string {
  if (score == null) return '#8294b6';
  if (score >= 4) return '#3ddc91';
  if (score >= 2.5) return '#f3b14e';
  return '#ff6b6b';
}

export const CATEGORY_COLORS: Record<string, string> = {
  Cost: '#ff6b6b',
  Productivity: '#2E75B6',
  Efficiency: '#7aa2f7',
  Quality: '#3ddc91',
  Compliance: '#D4A853',
  People: '#f3b14e',
  'Customer Experience': '#b07ad4',
};

export function categoryScores(kpis: KpiRecord[]) {
  const byCat: Record<string, number[]> = {};
  for (const k of kpis) {
    const s = kpiScore(k);
    if (s == null || !k.category) continue;
    (byCat[k.category] ??= []).push(s);
  }
  return Object.entries(byCat)
    .map(([category, scores]) => ({
      category,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score);
}

export function departmentScores(kpis: KpiRecord[]) {
  const byDept: Record<string, number[]> = {};
  for (const k of kpis) {
    const s = kpiScore(k);
    if (s == null || !k.department) continue;
    (byDept[k.department] ??= []).push(s);
  }
  return Object.entries(byDept)
    .map(([department, scores]) => ({
      department,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score);
}

/** CSS class for KPI score coloring — theme-aware */
export function scoreClass(score: number | null): string {
  if (score == null) return 'text-[var(--muted)]';
  if (score >= 4) return 'text-[var(--green)]';
  if (score >= 2.5) return 'text-[var(--amber)]';
  return 'text-[var(--red)]';
}

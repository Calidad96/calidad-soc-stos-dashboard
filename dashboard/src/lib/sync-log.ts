import type { MondayItem } from './sync/sync-utils';

/** Parse hub sync log item name → ISO time. e.g. Sync 2026-07-14T12-58-15-752Z */
export function syncLogItemToIso(item: Pick<MondayItem, 'name'>): string | null {
  const m = item.name.match(
    /^Sync (\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d+)Z$/
  );
  if (!m) return null;
  const [, date, hh, mm, ss, frac] = m;
  const ms = frac.padStart(3, '0').slice(0, 3);
  return `${date}T${hh}:${mm}:${ss}.${ms}Z`;
}

export function newestSyncLogItem<T extends Pick<MondayItem, 'name'>>(items: T[]): T | null {
  if (!items.length) return null;
  return [...items].sort((a, b) => {
    const ta = syncLogItemToIso(a);
    const tb = syncLogItemToIso(b);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return tb.localeCompare(ta);
  })[0];
}

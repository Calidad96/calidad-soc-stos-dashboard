export const US_TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { value: 'America/Denver', label: 'US Mountain (MT)' },
  { value: 'America/Chicago', label: 'US Central (CT)' },
  { value: 'America/New_York', label: 'US Eastern (ET)' },
] as const;

export function getClientTimezoneLabel(timezone: string): string {
  const opt = US_TIMEZONE_OPTIONS.find((o) => o.value === timezone);
  if (!opt) return timezone;
  const short = opt.label.match(/\(([^)]+)\)/)?.[1];
  return short ?? opt.label;
}

function looksDateOnly(value: string): boolean {
  return !/\d{1,2}:\d{2}/.test(value) && !/T\d{2}:/.test(value);
}

export function parseFlexibleDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d;
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

/** Format any timestamp for display in the US client timezone. */
export function formatDashboardTime(
  value: string | Date | null | undefined,
  timezone: string,
  options?: { showTimezone?: boolean; forceDateOnly?: boolean }
): string {
  if (value == null || value === '') return '—';

  if (typeof value === 'string' && looksDateOnly(value) && !options?.forceDateOnly) {
    const date = parseFlexibleDate(value);
    if (date) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    }
    return value;
  }

  const date = value instanceof Date ? value : parseFlexibleDate(String(value));
  if (!date) return String(value);

  const showTz = options?.showTimezone !== false;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(showTz ? { timeZoneName: 'short' } : {}),
  }).format(date);
}

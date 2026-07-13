import type { SyncSettings } from './sync-settings-constants';
import {
  formatDashboardTime,
  getClientTimezoneLabel,
  US_TIMEZONE_OPTIONS,
} from './client-time';

export { US_TIMEZONE_OPTIONS, getClientTimezoneLabel };

export interface ClientLocalTime {
  year: string;
  month: string;
  day: string;
  hour: number;
  minute: number;
  weekday: string;
  dateKey: string;
}

export function clampTimezone(tz: string | undefined): string {
  const allowed = US_TIMEZONE_OPTIONS.map((o) => o.value);
  if (tz && allowed.includes(tz as (typeof allowed)[number])) return tz;
  return 'America/Los_Angeles';
}

export function clampSyncTimeLocal(value: string | undefined): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return '06:00';
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return '06:00';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getClientLocalTime(
  timezone: string,
  date = new Date()
): ClientLocalTime {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );

  const hour = parseInt(parts.hour ?? '0', 10) % 24;

  return {
    year: parts.year ?? '',
    month: parts.month ?? '',
    day: parts.day ?? '',
    hour,
    minute: parseInt(parts.minute ?? '0', 10),
    weekday: parts.weekday ?? '',
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function formatClientDateTime(
  timezone: string,
  date = new Date()
): string {
  return formatDashboardTime(date, timezone);
}

function parseSyncTime(syncTimeLocal: string): { hour: number; minute: number } {
  const [h, m] = syncTimeLocal.split(':').map(Number);
  return { hour: h, minute: m };
}

/** True if current client-local time is inside the 5-minute sync window */
export function getSyncWindow(
  settings: SyncSettings,
  now = new Date()
): { inWindow: boolean; slot: string } {
  const local = getClientLocalTime(settings.clientTimezone, now);
  const { hour: syncH, minute: syncM } = parseSyncTime(settings.syncTimeLocal);
  const inMinuteWindow =
    local.minute >= syncM && local.minute < syncM + 5;

  if (settings.intervalMinutes === 1440) {
    const inWindow = local.hour === syncH && inMinuteWindow;
    return { inWindow, slot: `${local.dateKey}-daily` };
  }

  if (settings.intervalMinutes === 720) {
    const eveH = (syncH + 12) % 24;
    if (local.hour === syncH && inMinuteWindow) {
      return { inWindow: true, slot: `${local.dateKey}-am` };
    }
    if (local.hour === eveH && inMinuteWindow) {
      return { inWindow: true, slot: `${local.dateKey}-pm` };
    }
    return { inWindow: false, slot: '' };
  }

  if (settings.intervalMinutes === 10080) {
    if (local.weekday !== 'Mon') return { inWindow: false, slot: '' };
    const inWindow = local.hour === syncH && inMinuteWindow;
    return { inWindow, slot: `${local.dateKey}-weekly` };
  }

  return { inWindow: false, slot: '' };
}

export function describeSyncSchedule(settings: SyncSettings): string {
  const tzLabel =
    US_TIMEZONE_OPTIONS.find((o) => o.value === settings.clientTimezone)
      ?.label ?? settings.clientTimezone;

  if (!settings.autoSyncEnabled) return 'Automatic updates off — use Update now when needed.';

  const time = settings.syncTimeLocal;

  if (settings.intervalMinutes === 1440) {
    return `Updates daily at ${time} (${tzLabel})`;
  }
  if (settings.intervalMinutes === 720) {
    const [h] = time.split(':').map(Number);
    const eve = `${String((h + 12) % 24).padStart(2, '0')}:${time.split(':')[1]}`;
    return `Updates twice daily at ${time} and ${eve} (${tzLabel})`;
  }
  return `Updates every Monday at ${time} (${tzLabel})`;
}

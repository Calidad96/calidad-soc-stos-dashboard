export interface SyncSettings {
  autoSyncEnabled: boolean;
  intervalMinutes: number;
  /** IANA timezone for US client */
  clientTimezone: string;
  /** HH:mm in client timezone — when daily sync should run */
  syncTimeLocal: string;
}

export const SYNC_INTERVAL_OPTIONS = [
  {
    value: 1440,
    label: 'Once daily (recommended)',
    hint: 'Fresh data each US morning before the team starts.',
  },
  {
    value: 720,
    label: 'Twice daily',
    hint: 'Morning and evening updates in US time.',
  },
  {
    value: 10080,
    label: 'Once weekly (Monday)',
    hint: 'For lighter reporting — use Update now when needed.',
  },
] as const;

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSyncEnabled: true,
  intervalMinutes: 1440,
  clientTimezone: 'America/Los_Angeles',
  syncTimeLocal: '06:00',
};

export const ALLOWED_SYNC_INTERVALS = [720, 1440, 10080] as const;

export function clampSyncInterval(n: number): number {
  if ((ALLOWED_SYNC_INTERVALS as readonly number[]).includes(n)) return n;
  if (n < 720) return 1440;
  if (n < 1440) return 720;
  if (n < 10080) return 1440;
  return 10080;
}

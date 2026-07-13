import fs from 'fs/promises';
import path from 'path';
import { clampSyncTimeLocal, clampTimezone } from './sync-schedule';
import {
  clampSyncInterval,
  DEFAULT_SYNC_SETTINGS,
  type SyncSettings,
} from './sync-settings-constants';

export type { SyncSettings };
export {
  SYNC_INTERVAL_OPTIONS,
  DEFAULT_SYNC_SETTINGS,
} from './sync-settings-constants';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'sync-settings.json');

export async function readSyncSettings(): Promise<SyncSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SyncSettings>;
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SYNC_SETTINGS };
  }
}

export async function writeSyncSettings(
  patch: Partial<SyncSettings>
): Promise<SyncSettings> {
  const current = await readSyncSettings();
  const next = normalizeSettings({ ...current, ...patch });
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

function normalizeSettings(parsed: Partial<SyncSettings>): SyncSettings {
  return {
    autoSyncEnabled:
      parsed.autoSyncEnabled ?? DEFAULT_SYNC_SETTINGS.autoSyncEnabled,
    intervalMinutes: clampSyncInterval(
      parsed.intervalMinutes ?? DEFAULT_SYNC_SETTINGS.intervalMinutes
    ),
    clientTimezone: clampTimezone(parsed.clientTimezone),
    syncTimeLocal: clampSyncTimeLocal(parsed.syncTimeLocal),
  };
}

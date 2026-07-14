import { readSyncSettings } from './sync-settings';
import { getSyncWindow } from './sync-schedule';
import {
  getLastScheduledSlot,
  isSyncJobActive,
  triggerSync,
} from './sync-runner';
const CHECK_MS = 60 * 1000; // check every minute for US-time window

let timer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

export async function initSyncScheduler(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await applySchedule();
}

export async function applySchedule(): Promise<void> {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  const settings = await readSyncSettings();
  if (!settings.autoSyncEnabled) return;

  timer = setInterval(() => {
    void maybeRunScheduledSync();
  }, CHECK_MS);

  void maybeRunScheduledSync();
}

async function maybeRunScheduledSync(): Promise<void> {
  if (await isSyncJobActive()) return;

  const settings = await readSyncSettings();
  if (!settings.autoSyncEnabled) return;

  const { inWindow, slot } = getSyncWindow(settings);
  if (!inWindow || !slot) return;
  if (getLastScheduledSlot() === slot) return;

  const result = await triggerSync({ scheduledSlot: slot });
  if (!result.started) return;
}

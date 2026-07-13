import { executeSyncBundle } from './run-sync-bundle';

export type SyncRunStatus = 'idle' | 'running' | 'success' | 'partial' | 'error';

export interface SyncRunState {
  status: SyncRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  output: string;
  error: string | null;
  scheduledSlot: string | null;
}

let state: SyncRunState = {
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  output: '',
  error: null,
  scheduledSlot: null,
};

let lastScheduledSlot: string | null = null;
let activeRun: Promise<void> | null = null;

export function getSyncRunState(): SyncRunState {
  return { ...state };
}

export function getLastScheduledSlot(): string | null {
  return lastScheduledSlot;
}

export function setLastScheduledSlot(slot: string): void {
  lastScheduledSlot = slot;
}

export function isSyncRunning(): boolean {
  return state.status === 'running';
}

export async function triggerSync(opts?: {
  scheduledSlot?: string;
  wait?: boolean;
}): Promise<{
  started: boolean;
  message?: string;
}> {
  if (state.status === 'running') {
    if (opts?.wait && activeRun) {
      await activeRun;
      return { started: true };
    }
    return { started: false, message: 'Sync is already running' };
  }

  state = {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    output: '',
    error: null,
    scheduledSlot: opts?.scheduledSlot ?? null,
  };

  activeRun = runSyncProcess()
    .then(() => {
      if (state.scheduledSlot) {
        lastScheduledSlot = state.scheduledSlot;
      }
    })
    .catch((err) => {
      state.status = 'error';
      state.finishedAt = new Date().toISOString();
      state.error = err instanceof Error ? err.message : 'Sync failed';
    })
    .finally(() => {
      activeRun = null;
    });

  if (opts?.wait) {
    await activeRun;
  }

  return { started: true };
}

async function runSyncProcess(): Promise<void> {
  try {
    const text = await executeSyncBundle();
    state.output = text.slice(-4000);
    state.finishedAt = new Date().toISOString();
    state.status = /ERROR:|Partial/i.test(text) ? 'partial' : 'success';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    state.finishedAt = new Date().toISOString();
    state.status = 'error';
    state.error = message.slice(-800);
    state.output = state.output || message;
    throw err;
  }
}

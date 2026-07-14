import {
  clearHubItemIds,
  logSyncResult,
  pullStepData,
  pullStepHubIds,
  pullStepRows,
  writeHubRows,
} from './sync/run-sync';
import type { SyncRow } from './sync/sync-session';
import { SYNC_STEPS, type SyncStepId } from './sync/sync-steps';
import { todayDate } from './sync/sync-utils';
import { writeLastSyncRun } from './last-sync-run';
import {
  getLatestGithubSyncRun,
  isGithubSyncRunning,
  triggerGithubSync,
} from './github-sync';
import { stopAutomaticSync } from './sync-orchestrator';

export type SyncRunStatus = 'idle' | 'running' | 'success' | 'partial' | 'error';

export interface SyncRunState {
  status: SyncRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  output: string;
  error: string | null;
  scheduledSlot: string | null;
  runId: string | null;
  currentStep: string | null;
  progress: string | null;
}

let state: SyncRunState = {
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  output: '',
  error: null,
  scheduledSlot: null,
  runId: null,
  currentStep: null,
  progress: null,
};

let lastScheduledSlot: string | null = null;
let syncTriggeredAt: string | null = null;

export function getSyncRunState(): SyncRunState {
  return { ...state };
}

export function getLastScheduledSlot(): string | null {
  return lastScheduledSlot;
}

export async function refreshSyncRunFromGithub(): Promise<SyncRunState> {
  const running = await isGithubSyncRunning();
  const latest = await getLatestGithubSyncRun();

  if (running) {
    state.status = 'running';
    state.progress =
      'GitHub is syncing all boards (no timeout) — usually 10–20 minutes.';
    state.output = state.progress;
    state.currentStep = latest?.status === 'in_progress' ? 'GitHub Actions' : null;
    return { ...state };
  }

  if (state.status === 'running') {
    state.status = 'idle';
    state.progress = '';
    state.currentStep = null;
    if (latest?.conclusion === 'success') {
      state.status = 'success';
      state.progress = 'Last GitHub sync succeeded.';
    } else if (latest?.conclusion === 'failure') {
      state.status = 'error';
      state.error = 'Last GitHub sync failed — check GitHub Actions logs.';
      state.progress = state.error;
    }
  }

  return { ...state };
}

export function isSyncRunning(): boolean {
  return state.status === 'running';
}

export async function isSyncJobActive(): Promise<boolean> {
  return isGithubSyncRunning();
}

export async function startAutomaticSync(): Promise<{
  started: boolean;
  message?: string;
}> {
  if (await isGithubSyncRunning()) {
    return { started: false, message: 'A GitHub sync is already running.' };
  }

  await stopAutomaticSync();

  const result = await triggerGithubSync();
  if (result.triggered) {
    syncTriggeredAt = new Date().toISOString();
    state.status = 'running';
    state.startedAt = syncTriggeredAt;
    state.finishedAt = null;
    state.error = null;
    state.progress = result.message;
    state.output = result.message;
    state.currentStep = 'GitHub Actions';
  }

  return { started: result.triggered, message: result.message };
}

export async function triggerSync(opts?: {
  scheduledSlot?: string;
}): Promise<{ started: boolean; message?: string }> {
  const result = await startAutomaticSync();
  if (result.started && opts?.scheduledSlot) {
    lastScheduledSlot = opts.scheduledSlot;
  }
  return result;
}

export async function stopSync(): Promise<{ stopped: boolean; message: string }> {
  await stopAutomaticSync();
  state.status = 'idle';
  state.progress = '';
  state.currentStep = null;
  state.output = '';
  return {
    stopped: true,
    message:
      'Dashboard cleared. If GitHub Actions is still running, let it finish or cancel the run in GitHub → Actions.',
  };
}

export async function executeSyncAction(body: {
  action?: 'start' | 'finish' | 'start-worker' | 'stop';
  step?: string;
  phase?: 'pull' | 'clear' | 'write';
  part?: 'rows' | 'ids';
  ids?: string[];
  rows?: SyncRow[];
  runId?: string;
  started?: string;
  totalWritten?: number;
  errors?: string[];
}) {
  if (body.action === 'start-worker' || body.action === 'start') {
    return startAutomaticSync();
  }

  if (body.action === 'stop') {
    return stopSync();
  }

  if (body.action === 'finish') {
    if (!body.runId || !body.started) throw new Error('runId and started are required');
    const errors = body.errors ?? [];
    await logSyncResult({
      runId: body.runId,
      started: body.started,
      totalWritten: body.totalWritten ?? 0,
      errors,
    });
    state.finishedAt = new Date().toISOString();
    state.status = errors.length ? 'partial' : 'success';
    state.error = errors.length ? errors.join('; ') : null;
    state.currentStep = null;
    state.progress = errors.length
      ? `Partial — ${errors.length} step(s) had issues`
      : 'Complete';
    state.output = state.progress;
    await writeLastSyncRun({
      runId: body.runId,
      finishedAt: state.finishedAt,
      status: state.status,
      totalWritten: body.totalWritten ?? 0,
      errors,
    });
    return {
      completed: true,
      totalWritten: body.totalWritten ?? 0,
      errors,
    };
  }

  if (body.phase === 'pull') {
    if (!body.step) throw new Error('step is required');
    const stepId = body.step as SyncStepId;
    const step = SYNC_STEPS.find((s) => s.id === stepId);
    state.currentStep = step?.label ?? stepId;
    if (body.part === 'rows') {
      state.progress = `Pulling ${state.currentStep} rows`;
      const result = await pullStepRows(stepId);
      return { ...result, phase: 'pull' as const, part: 'rows' as const };
    }
    if (body.part === 'ids') {
      state.progress = `Pulling ${state.currentStep} hub IDs`;
      const result = await pullStepHubIds(stepId);
      return { ...result, phase: 'pull' as const, part: 'ids' as const };
    }
    state.progress = `Pulling ${state.currentStep}`;
    const result = await pullStepData(stepId);
    return { ...result, phase: 'pull' as const };
  }

  if (body.phase === 'clear') {
    if (!body.ids?.length) return { deleted: 0, phase: 'clear' as const };
    state.progress = `Clearing ${body.ids.length} items`;
    const result = await clearHubItemIds(body.ids);
    return { ...result, phase: 'clear' as const };
  }

  if (body.phase === 'write') {
    if (!body.step) throw new Error('step is required');
    const stepId = body.step as SyncStepId;
    const step = SYNC_STEPS.find((s) => s.id === stepId);
    state.currentStep = step?.label ?? stepId;
    state.progress = `Writing ${body.rows?.length ?? 0} rows`;
    const result = await writeHubRows(stepId, body.rows ?? []);
    return { ...result, phase: 'write' as const };
  }

  throw new Error('Invalid sync action');
}

export function getSyncTriggeredAt(): string | null {
  return syncTriggeredAt;
}

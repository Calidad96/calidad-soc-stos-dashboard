import {
  clearHubItemIds,
  logSyncResult,
  pullStepData,
  runSyncStateless,
  writeHubRows,
} from './sync/run-sync';
import type { SyncRow } from './sync/sync-session';
import { SYNC_STEPS, type SyncStepId } from './sync/sync-steps';
import { todayDate } from './sync/sync-utils';
import { writeLastSyncRun } from './last-sync-run';

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

export function getSyncRunState(): SyncRunState {
  return { ...state };
}

export function getLastScheduledSlot(): string | null {
  return lastScheduledSlot;
}

export function isSyncRunning(): boolean {
  return state.status === 'running';
}

export async function runChunkedSyncForCron(): Promise<void> {
  state.status = 'running';
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.error = null;
  state.progress = 'Running scheduled sync…';

  try {
    const result = await runSyncStateless();
    state.finishedAt = new Date().toISOString();
    state.status = 'success';
    state.progress = `Complete — ${result.totalWritten} items written`;
    state.output = state.progress;
  } catch (err) {
    state.status = 'error';
    state.finishedAt = new Date().toISOString();
    state.error = err instanceof Error ? err.message : 'Sync failed';
    state.progress = state.error;
    throw err;
  }
}

export async function triggerSync(opts?: {
  scheduledSlot?: string;
  wait?: boolean;
}): Promise<{ started: boolean; message?: string }> {
  if (state.status === 'running') {
    return { started: false, message: 'Sync is already running' };
  }

  const runPromise = (async () => {
    try {
      await runChunkedSyncForCron();
      if (opts?.scheduledSlot) lastScheduledSlot = opts.scheduledSlot;
    } catch (err) {
      state.status = 'error';
      state.finishedAt = new Date().toISOString();
      state.error = err instanceof Error ? err.message : 'Sync failed';
      throw err;
    }
  })();

  if (opts?.wait) await runPromise;
  else runPromise.catch(() => undefined);

  return { started: true };
}

export async function executeSyncAction(body: {
  action?: 'start' | 'finish';
  step?: string;
  phase?: 'pull' | 'clear' | 'write';
  ids?: string[];
  rows?: SyncRow[];
  runId?: string;
  started?: string;
  totalWritten?: number;
  errors?: string[];
}) {
  if (body.action === 'start') {
    const runId = new Date().toISOString().replace(/[:.]/g, '-');
    state.status = 'running';
    state.startedAt = new Date().toISOString();
    state.finishedAt = null;
    state.error = null;
    state.runId = runId;
    state.progress = 'Starting…';
    return {
      runId,
      started: todayDate(),
      steps: SYNC_STEPS.map((s) => ({
        id: s.id,
        label: s.label,
        batched: s.batched,
        batchSize: s.batchSize,
        clearBatchSize: s.clearBatchSize,
        appendOnly: 'appendOnly' in s && Boolean(s.appendOnly),
      })),
    };
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

export async function executeSyncBundle(): Promise<string> {
  const result = await runSyncStateless();
  return `Items written: ${result.totalWritten}\nErrors: ${result.errors.length}`;
}

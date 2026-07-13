import {
  createSession,
  loadSession,
  saveSession,
} from './sync/sync-session';
import {
  finishSyncRun,
  prepareSyncStep,
  runSync,
  runSyncStepWhole,
  writeSyncStepBatch,
} from './sync/run-sync';
import { SYNC_STEPS, type SyncStepId } from './sync/sync-steps';
import { todayDate } from './sync/sync-utils';

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

export function startSyncSession(): string {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  createSession(runId, todayDate());
  state = {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    output: '',
    error: null,
    scheduledSlot: null,
    runId,
    currentStep: null,
    progress: null,
  };
  return runId;
}

export async function runChunkedSyncForCron(): Promise<void> {
  const runId = startSyncSession();
  const errors: string[] = [];

  for (const step of SYNC_STEPS) {
    state.currentStep = step.label;
    state.progress = step.label;
    try {
      if (step.batched) {
        await prepareSyncStep(runId, step.id);
        let batch = 0;
        let hasMore = true;
        while (hasMore) {
          const result = await writeSyncStepBatch(runId, step.id, batch);
          hasMore = result.hasMore;
          batch++;
        }
      } else {
        await runSyncStepWhole(runId, step.id);
      }
    } catch (err) {
      errors.push(`${step.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const session = loadSession(runId);
  if (session && errors.length) {
    session.errors.push(...errors);
    saveSession(session);
  }

  await finishSyncRun(runId);
  state.finishedAt = new Date().toISOString();
  state.status = errors.length ? 'partial' : 'success';
  state.currentStep = null;
  state.progress = errors.length ? errors.join('; ') : 'Complete';
  state.output = state.progress;
  if (errors.length) state.error = errors.join('; ');
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
  runId?: string;
  step?: string;
  batch?: number;
}) {
  if (body.action === 'start') {
    const runId = startSyncSession();
    return { runId, steps: SYNC_STEPS.map((s) => ({ id: s.id, label: s.label, batched: s.batched })) };
  }

  if (!body.runId) throw new Error('runId is required');

  if (body.action === 'finish') {
    const session = await finishSyncRun(body.runId);
    state.finishedAt = new Date().toISOString();
    state.status = session.errors.length ? 'partial' : 'success';
    state.currentStep = null;
    state.progress = 'Complete';
    return { completed: true, totalWritten: session.totalWritten, errors: session.errors };
  }

  if (!body.step) throw new Error('step is required');
  const stepId = body.step as SyncStepId;
  const step = SYNC_STEPS.find((s) => s.id === stepId);
  if (!step) throw new Error(`Unknown step: ${body.step}`);

  state.status = 'running';
  state.currentStep = step.label;
  state.progress = step.label;

  if (body.batch === undefined) {
    if (step.batched) {
      const prep = await prepareSyncStep(body.runId, stepId);
      return { prepared: true, ...prep };
    }
    const result = await runSyncStepWhole(body.runId, stepId);
    return { ...result, step: stepId, label: step.label };
  }

  const result = await writeSyncStepBatch(body.runId, stepId, body.batch);
  return { ...result, step: stepId, label: step.label };
}

// Legacy full run for local CLI compatibility
export async function executeSyncBundle(): Promise<string> {
  const logs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const capture =
    (write: typeof console.log) =>
    (...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(' '));
      write(...args);
    };
  console.log = capture(origLog);
  console.error = capture(origErr);
  try {
    await runSync();
    return logs.join('\n');
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

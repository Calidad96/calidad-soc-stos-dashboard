import {
  clearHubItemIds,
  logSyncResult,
  pullStepHubIds,
  pullStepRows,
  writeHubRows,
} from './sync/run-sync';
import { SYNC_STEPS, type SyncStepId } from './sync/sync-steps';
import { todayDate } from './sync/sync-utils';
import {
  isRetryableSyncError,
  syncFailedPassWaitMs,
  syncRetryLabel,
  syncRetryWaitMs,
  SYNC_MAX_RETRIES,
} from './sync-retry-config';
import {
  clearStepStash,
  loadStepStash,
  stashStepData,
} from './sync-stash';
import {
  clearSyncJob,
  isJobActive,
  isStaleRunningJob,
  loadSyncJob,
  saveSyncJob,
  type SyncJobState,
} from './sync-job';
import { chainSyncWorker, invokeSyncWorker } from './sync-worker-client';
import { writeLastSyncRun } from './last-sync-run';
import type { SyncRunStatus } from './sync-runner';

const BURST_MS = 45_000;
const MAX_FAILED_PASSES = 4;
const ACTION_ITEM_SOURCES = 2;

interface TickResult {
  job: SyncJobState;
  chain: boolean;
  done: boolean;
  waitRetry: boolean;
  message: string;
}

type StateMirror = {
  status: SyncRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  runId: string | null;
  currentStep: string | null;
  progress: string | null;
  output: string;
};

let mirrorCallback: ((patch: Partial<StateMirror>) => void) | null = null;

export function registerSyncStateMirror(
  cb: (patch: Partial<StateMirror>) => void
): void {
  mirrorCallback = cb;
}

function mirror(patch: Partial<StateMirror>): void {
  mirrorCallback?.(patch);
}

function newJob(stepQueue: SyncStepId[], retryPass = 0): SyncJobState {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    version: 1,
    runId,
    started: todayDate(),
    status: 'running',
    nextRetryAt: null,
    retryAttempt: 0,
    operationLabel: 'Starting automatic sync…',
    stepIndex: 0,
    stepQueue,
    phase: 'pull-rows',
    clearOffset: 0,
    writeOffset: 0,
    totalWritten: 0,
    errors: [],
    failedStepIds: [],
    retryPass,
    pullSourceIndex: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function createAndStartSyncJob(
  stepIds?: SyncStepId[]
): Promise<SyncJobState> {
  const existing = await loadSyncJob();
  if (isJobActive(existing)) {
    if (isStaleRunningJob(existing)) {
      existing!.operationLabel = 'Resuming stalled sync…';
      await saveSyncJob(existing!);
    }
    chainSyncWorker();
    return existing!;
  }

  const job = newJob(stepIds ?? SYNC_STEPS.map((s) => s.id));
  await saveSyncJob(job);
  mirror({
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
    runId: job.runId,
    currentStep: null,
    progress: job.operationLabel,
    output: job.operationLabel,
  });
  chainSyncWorker();
  void invokeSyncWorker().catch(() => undefined);
  return job;
}

function stepMeta(stepId: SyncStepId) {
  return SYNC_STEPS.find((s) => s.id === stepId)!;
}

async function handleTickError(
  job: SyncJobState,
  stepId: SyncStepId,
  err: unknown
): Promise<TickResult> {
  const step = stepMeta(stepId);
  const message = err instanceof Error ? err.message : String(err);

  if (isRetryableSyncError(0, message) && job.retryAttempt < SYNC_MAX_RETRIES) {
    job.retryAttempt += 1;
    job.status = 'retry_wait';
    job.nextRetryAt = new Date(
      Date.now() + syncRetryWaitMs(job.retryAttempt)
    ).toISOString();
    job.operationLabel = `${step.label} — auto-retry in ${syncRetryLabel(job.retryAttempt)}`;
    mirror({ progress: job.operationLabel, output: job.operationLabel });
    return {
      job,
      chain: false,
      done: false,
      waitRetry: true,
      message: job.operationLabel,
    };
  }

  job.errors.push(`${step.label}: ${message}`);
  if (!job.failedStepIds.includes(stepId)) {
    job.failedStepIds.push(stepId);
  }
  await clearStepStash(job.runId, stepId);
  job.stepIndex += 1;
  job.phase = 'pull-rows';
  job.clearOffset = 0;
  job.writeOffset = 0;
  job.retryAttempt = 0;
  job.operationLabel = `${step.label} failed — continuing with next board`;
  mirror({
    currentStep: step.label,
    progress: job.operationLabel,
    output: job.operationLabel,
  });
  return {
    job,
    chain: true,
    done: false,
    waitRetry: false,
    message: job.operationLabel,
  };
}

async function finishJob(job: SyncJobState): Promise<TickResult> {
  if (job.failedStepIds.length && job.retryPass < MAX_FAILED_PASSES) {
    job.retryPass += 1;
    job.stepQueue = [...job.failedStepIds];
    job.failedStepIds = [];
    job.stepIndex = 0;
    job.phase = 'pull-rows';
    job.clearOffset = 0;
    job.writeOffset = 0;
    job.retryAttempt = 0;
    job.status = 'retry_wait';
    job.nextRetryAt = new Date(Date.now() + syncFailedPassWaitMs()).toISOString();
    job.operationLabel = `Retrying ${job.stepQueue.length} failed board(s) in 30 min (pass ${job.retryPass}/${MAX_FAILED_PASSES})`;
    mirror({ progress: job.operationLabel, output: job.operationLabel });
    return {
      job,
      chain: false,
      done: false,
      waitRetry: true,
      message: job.operationLabel,
    };
  }

  await logSyncResult({
    runId: job.runId,
    started: job.started,
    totalWritten: job.totalWritten,
    errors: job.errors,
  });

  const finishedAt = new Date().toISOString();
  const status: SyncRunStatus = job.errors.length ? 'partial' : 'success';
  await writeLastSyncRun({
    runId: job.runId,
    finishedAt,
    status,
    totalWritten: job.totalWritten,
    errors: job.errors,
  });

  job.status = 'completed';
  job.phase = 'finish';
  job.operationLabel = job.errors.length
    ? `Partial — ${job.errors.length} board(s) had issues`
    : `Complete — ${job.totalWritten} items written`;

  mirror({
    status,
    finishedAt,
    error: job.errors.length ? job.errors.join('; ') : null,
    currentStep: null,
    progress: job.operationLabel,
    output: job.operationLabel,
  });

  return {
    job,
    chain: false,
    done: true,
    waitRetry: false,
    message: job.operationLabel,
  };
}

async function executeOneTick(job: SyncJobState): Promise<TickResult> {
  if (job.stepIndex >= job.stepQueue.length) {
    return finishJob(job);
  }

  const stepId = job.stepQueue[job.stepIndex];
  const step = stepMeta(stepId);

  try {
    if (job.phase === 'pull-rows') {
      job.operationLabel = `Pulling ${step.label} — source data`;
      job.lastUpdatedAt = new Date().toISOString();
      mirror({ currentStep: step.label, progress: job.operationLabel });
      await saveSyncJob(job);

      const partial =
        stepId === 'actionItems'
          ? await pullStepRows(stepId, job.pullSourceIndex)
          : await pullStepRows(stepId);

      const stash = (await loadStepStash(job.runId, stepId)) ?? {
        rows: [],
        hubIds: [],
      };
      stash.rows = [...stash.rows, ...partial.rows];

      if (stepId === 'actionItems' && partial.hasMoreSources) {
        job.pullSourceIndex += 1;
        await stashStepData(job.runId, stepId, stash);
        job.operationLabel = `Pulling ${step.label} — board ${job.pullSourceIndex + 1}/${ACTION_ITEM_SOURCES}`;
        return {
          job,
          chain: true,
          done: false,
          waitRetry: false,
          message: job.operationLabel,
        };
      }

      await stashStepData(job.runId, stepId, stash);
      job.phase = 'pull-ids';
      job.pullSourceIndex = 0;
      job.retryAttempt = 0;
      return {
        job,
        chain: true,
        done: false,
        waitRetry: false,
        message: job.operationLabel,
      };
    }

    if (job.phase === 'pull-ids') {
      let stash = await loadStepStash(job.runId, stepId);
      if (!stash?.rows.length) {
        job.phase = 'pull-rows';
        return {
          job,
          chain: true,
          done: false,
          waitRetry: false,
          message: `Re-pulling ${step.label} rows`,
        };
      }

      job.operationLabel = `Pulling ${step.label} — hub IDs`;
      mirror({ currentStep: step.label, progress: job.operationLabel });
      const { hubIds, appendOnly } = await pullStepHubIds(stepId);
      stash.hubIds = hubIds;
      await stashStepData(job.runId, stepId, stash);
      job.phase = appendOnly || hubIds.length === 0 ? 'write' : 'clear';
      job.clearOffset = 0;
      job.writeOffset = 0;
      job.retryAttempt = 0;
      return {
        job,
        chain: true,
        done: false,
        waitRetry: false,
        message: job.operationLabel,
      };
    }

    if (job.phase === 'clear') {
      const stash = await loadStepStash(job.runId, stepId);
      if (!stash) {
        job.phase = 'pull-rows';
        return { job, chain: true, done: false, waitRetry: false, message: 'Re-staging' };
      }

      const batchSize = step.batched ? step.clearBatchSize : stash.hubIds.length;
      const batch = stash.hubIds.slice(
        job.clearOffset,
        job.clearOffset + batchSize
      );
      job.operationLabel = `Clearing ${step.label} — ${Math.min(job.clearOffset + batch.length, stash.hubIds.length)}/${stash.hubIds.length}`;
      mirror({ currentStep: step.label, progress: job.operationLabel });

      if (batch.length) {
        await clearHubItemIds(batch);
      }

      job.clearOffset += batch.length ? batchSize : stash.hubIds.length;
      if (job.clearOffset >= stash.hubIds.length) {
        job.phase = 'write';
        job.writeOffset = 0;
      }
      job.retryAttempt = 0;
      return {
        job,
        chain: true,
        done: false,
        waitRetry: false,
        message: job.operationLabel,
      };
    }

    if (job.phase === 'write') {
      let stash = await loadStepStash(job.runId, stepId);
      if (!stash?.rows.length) {
        job.phase = 'pull-rows';
        return { job, chain: true, done: false, waitRetry: false, message: 'Re-staging rows' };
      }

      const batchSize = step.batched ? step.batchSize : stash.rows.length;
      const batch = stash.rows.slice(job.writeOffset, job.writeOffset + batchSize);
      job.operationLabel = `Writing ${step.label} — ${Math.min(job.writeOffset + batch.length, stash.rows.length)}/${stash.rows.length}`;
      mirror({ currentStep: step.label, progress: job.operationLabel });

      if (batch.length) {
        const result = await writeHubRows(stepId, batch);
        job.totalWritten += result.written;
      }

      job.writeOffset += batch.length ? batchSize : stash.rows.length;
      if (job.writeOffset >= stash.rows.length) {
        await clearStepStash(job.runId, stepId);
        job.stepIndex += 1;
        job.phase = 'pull-rows';
        job.clearOffset = 0;
        job.writeOffset = 0;
        job.retryAttempt = 0;
      }

      return {
        job,
        chain: true,
        done: false,
        waitRetry: false,
        message: job.operationLabel,
      };
    }

    return finishJob(job);
  } catch (err) {
    return handleTickError(job, stepId, err);
  }
}

export async function runWorkerBurst(): Promise<{
  shouldChain: boolean;
  done: boolean;
  message: string;
}> {
  let job = await loadSyncJob();
  if (!job || job.status === 'idle') {
    return { shouldChain: false, done: true, message: 'No active sync job' };
  }

  if (job.status === 'completed') {
    return { shouldChain: false, done: true, message: 'Sync already completed' };
  }

  if (job.status === 'retry_wait') {
    if (!job.nextRetryAt || Date.parse(job.nextRetryAt) > Date.now()) {
      return {
        shouldChain: false,
        done: false,
        message: job.operationLabel || 'Waiting for scheduled retry',
      };
    }
    job.status = 'running';
    job.operationLabel = job.operationLabel.replace(/auto-retry in.*/, 'resuming…');
    await saveSyncJob(job);
    mirror({ status: 'running', progress: job.operationLabel });
  } else if (isStaleRunningJob(job)) {
    job.operationLabel = `${job.operationLabel || 'Sync'} — resuming after timeout`;
    await saveSyncJob(job);
  }

  const deadline = Date.now() + BURST_MS;
  let ticks = 0;

  while (Date.now() < deadline && ticks < 1) {
    ticks += 1;
    const tick = await executeOneTick(job);
    job = tick.job;
    await saveSyncJob(job);

    if (tick.done) {
      return { shouldChain: false, done: true, message: tick.message };
    }
    if (tick.waitRetry) {
      return { shouldChain: false, done: false, message: tick.message };
    }
    if (!tick.chain) break;
  }

  return {
    shouldChain: true,
    done: false,
    message: job.operationLabel || 'Continuing sync…',
  };
}

export async function resumeSyncIfDue(): Promise<boolean> {
  const job = await loadSyncJob();
  if (!job) return false;

  if (job.status === 'retry_wait') {
    if (!job.nextRetryAt || Date.parse(job.nextRetryAt) > Date.now()) return false;
    chainSyncWorker();
    return true;
  }

  if (isStaleRunningJob(job)) {
    chainSyncWorker();
    return true;
  }

  return false;
}

export async function resetSyncJob(): Promise<void> {
  await clearSyncJob();
}

import { loadHubRegistry } from './sync/hub-registry';
import {
  createItem,
  getAllBoardItems,
  updateItemColumns,
} from './sync/monday-write';
import { buildColumnValues } from './sync/sync-utils';
import type { SyncStepId } from './sync/sync-steps';

const JOB_ITEM_NAME = '__SYNC_JOB__';

export type SyncJobPhase = 'pull-rows' | 'pull-ids' | 'clear' | 'write' | 'finish';
export type SyncJobStatus = 'idle' | 'running' | 'retry_wait' | 'completed';

export interface SyncJobState {
  version: 1;
  runId: string;
  started: string;
  status: SyncJobStatus;
  nextRetryAt: string | null;
  retryAttempt: number;
  operationLabel: string;
  stepIndex: number;
  stepQueue: SyncStepId[];
  phase: SyncJobPhase;
  clearOffset: number;
  writeOffset: number;
  totalWritten: number;
  errors: string[];
  failedStepIds: SyncStepId[];
  retryPass: number;
  /** For multi-source pulls (e.g. action items = 2 boards). */
  pullSourceIndex: number;
  lastUpdatedAt: string;
}

export interface SyncJobPublic {
  status: SyncJobStatus;
  nextRetryAt: string | null;
  resumeDue: boolean;
  operationLabel: string;
  stepIndex: number;
  stepCount: number;
  phase: SyncJobPhase;
  retryAttempt: number;
  errors: string[];
}

let cachedJobItemId: string | null = null;

function emptyJob(): SyncJobState {
  return {
    version: 1,
    runId: '',
    started: '',
    status: 'idle',
    nextRetryAt: null,
    retryAttempt: 0,
    operationLabel: '',
    stepIndex: 0,
    stepQueue: [],
    phase: 'pull-rows',
    clearOffset: 0,
    writeOffset: 0,
    totalWritten: 0,
    errors: [],
    failedStepIds: [],
    retryPass: 0,
    pullSourceIndex: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

function registryCols() {
  const registry = loadHubRegistry();
  return {
    boardId: registry.boards.syncLog.id,
    colMap: registry.columnIds.syncLog,
  };
}

async function ensureJobItem(): Promise<string> {
  if (cachedJobItemId) return cachedJobItemId;
  const { boardId } = registryCols();
  const items = await getAllBoardItems(boardId);
  const existing = items.find((i) => i.name === JOB_ITEM_NAME);
  if (existing) {
    cachedJobItemId = existing.id;
    return existing.id;
  }
  const created = await createItem(boardId, JOB_ITEM_NAME, {});
  cachedJobItemId = created.id;
  return created.id;
}

function parseJobPayload(raw: string | null | undefined): SyncJobState | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as SyncJobState;
    if (parsed?.version !== 1 || !parsed.runId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readColumnText(
  columnValues: { column?: { title?: string }; text?: string; value?: string }[] | undefined,
  title: string
): string {
  const cv = columnValues?.find((c) => c.column?.title === title);
  if (!cv) return '';
  if (cv.text?.trim()) return cv.text.trim();
  if (!cv.value) return '';

  const raw = cv.value.trim();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Monday long_text wrapper: {"text":"..."}
    if (typeof parsed.text === 'string') return parsed.text.trim();
    // Sync job JSON stored directly in the column
    if (parsed.version === 1 && typeof parsed.runId === 'string') return raw;
  } catch {
    // plain string value
  }
  return raw;
}

async function fetchJobItem(): Promise<{
  id: string;
  name: string;
  column_values?: { column?: { title?: string }; text?: string; value?: string }[];
} | null> {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) return null;
  const { boardId } = registryCols();

  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'API-Version': '2024-10',
    },
    body: JSON.stringify({
      query: `query ($boardId: [ID!]) {
        boards(ids: $boardId) {
          items_page(limit: 50) {
            items {
              id name
              column_values { text value column { title } }
            }
          }
        }
      }`,
      variables: { boardId: [boardId] },
    }),
    cache: 'no-store',
  });

  const json = await res.json();
  const items = json.data?.boards?.[0]?.items_page?.items ?? [];
  return items.find((i: { name: string }) => i.name === JOB_ITEM_NAME) ?? null;
}

export async function loadSyncJob(): Promise<SyncJobState | null> {
  const jobItem = await fetchJobItem();
  if (!jobItem) return null;
  cachedJobItemId = jobItem.id;
  const raw = readColumnText(jobItem.column_values, 'Errors');
  const job = parseJobPayload(raw);
  if (!job || job.status === 'idle') return job?.status === 'idle' ? job : null;
  return {
    ...job,
    pullSourceIndex: job.pullSourceIndex ?? 0,
    lastUpdatedAt: job.lastUpdatedAt ?? job.started,
  };
}

export async function saveSyncJob(job: SyncJobState): Promise<void> {
  const { boardId, colMap } = registryCols();
  const itemId = await ensureJobItem();
  const payload = JSON.stringify({
    ...job,
    lastUpdatedAt: new Date().toISOString(),
  });
  const statusLabel =
    job.status === 'running'
      ? 'Running'
      : job.status === 'retry_wait'
        ? 'Retry scheduled'
        : job.status === 'completed'
          ? job.errors.length
            ? 'Partial'
            : 'Success'
          : 'Idle';

  await updateItemColumns(
    boardId,
    itemId,
    buildColumnValues(colMap, {
      'Run ID': job.runId || '—',
      Started: job.started || undefined,
      Status: statusLabel,
      'Items Written': job.totalWritten,
      Errors: payload,
    })
  );
}

const STALE_JOB_MS = 3 * 60 * 1000;

/** Running job with no progress for several minutes — worker likely timed out. */
export function isStaleRunningJob(job: SyncJobState | null): boolean {
  if (!job || job.status !== 'running') return false;
  const updated = Date.parse(job.lastUpdatedAt || '');
  if (Number.isNaN(updated)) return true;
  return Date.now() - updated > STALE_JOB_MS;
}

export async function clearSyncJob(): Promise<void> {
  await saveSyncJob(emptyJob());
}

export function toPublicJob(job: SyncJobState | null): SyncJobPublic | null {
  if (!job || job.status === 'idle' || job.status === 'completed') return null;
  const resumeDue =
    job.status === 'retry_wait' &&
    Boolean(job.nextRetryAt && Date.parse(job.nextRetryAt) <= Date.now());
  return {
    status: job.status,
    nextRetryAt: job.nextRetryAt,
    resumeDue,
    operationLabel: job.operationLabel,
    stepIndex: job.stepIndex,
    stepCount: job.stepQueue.length,
    phase: job.phase,
    retryAttempt: job.retryAttempt,
    errors: job.errors,
  };
}

export function isJobActive(job: SyncJobState | null): boolean {
  return job?.status === 'running' || job?.status === 'retry_wait';
}

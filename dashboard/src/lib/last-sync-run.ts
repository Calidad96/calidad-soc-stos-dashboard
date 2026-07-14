import fs from 'fs/promises';
import path from 'path';
import { HUB_BOARDS } from './config';
import { fetchBoardItems, parseItem } from './monday';
import { newestSyncLogItem, syncLogItemToIso } from './sync-log';
import type { SyncRunStatus } from './sync-runner';

export interface LastSyncRunRecord {
  runId: string;
  finishedAt: string;
  status: SyncRunStatus;
  totalWritten: number;
  errors: string[];
}

const RECORD_PATH = path.join(process.cwd(), 'data', 'last-sync-run.json');

export async function readLastSyncRun(): Promise<LastSyncRunRecord | null> {
  try {
    const raw = await fs.readFile(RECORD_PATH, 'utf8');
    return JSON.parse(raw) as LastSyncRunRecord;
  } catch {
    return null;
  }
}

export async function writeLastSyncRun(record: LastSyncRunRecord): Promise<void> {
  try {
    await fs.mkdir(path.dirname(RECORD_PATH), { recursive: true });
    await fs.writeFile(RECORD_PATH, JSON.stringify(record, null, 2), 'utf8');
  } catch {
    // Read-only filesystem on Vercel — Monday sync log is the source of truth there.
  }
}

export async function fetchLatestSyncRunFromMonday(): Promise<LastSyncRunRecord | null> {
  const items = await fetchBoardItems(HUB_BOARDS.syncLog);
  const latest = newestSyncLogItem(items);
  if (!latest) return null;

  const fields = parseItem(latest);
  const finishedAt = syncLogItemToIso(latest);
  if (!finishedAt) return null;

  const statusLabel = String(fields.Status ?? '');
  let status: SyncRunStatus = 'idle';
  if (statusLabel === 'Partial') status = 'partial';
  else if (statusLabel === 'Success') status = 'success';

  const errorsRaw = fields.Errors;
  const errors =
    errorsRaw && String(errorsRaw).trim()
      ? String(errorsRaw).split('\n').map((s) => s.trim()).filter(Boolean)
      : [];

  return {
    runId: String(fields['Run ID'] ?? latest.name.replace(/^Sync /, '')),
    finishedAt,
    status,
    totalWritten: Number(fields['Items Written'] ?? 0),
    errors,
  };
}

export async function resolveLastSyncRun(): Promise<LastSyncRunRecord | null> {
  try {
    const fromMonday = await fetchLatestSyncRunFromMonday();
    if (fromMonday) return fromMonday;
  } catch {
    // Fall back to local file when Monday is unavailable.
  }
  return readLastSyncRun();
}

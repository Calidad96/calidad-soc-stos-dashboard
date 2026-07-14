import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { SyncRow } from './sync/sync-session';

const STASH_DIR = path.join(os.tmpdir(), 'calidad-sync-stash');

function stashPath(runId: string, stepId: string): string {
  const safe = `${runId}-${stepId}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(STASH_DIR, `${safe}.json`);
}

export interface StepStash {
  rows: SyncRow[];
  hubIds: string[];
}

export async function stashStepData(
  runId: string,
  stepId: string,
  data: StepStash
): Promise<void> {
  await fs.mkdir(STASH_DIR, { recursive: true });
  await fs.writeFile(stashPath(runId, stepId), JSON.stringify(data), 'utf8');
}

export async function loadStepStash(
  runId: string,
  stepId: string
): Promise<StepStash | null> {
  try {
    const raw = await fs.readFile(stashPath(runId, stepId), 'utf8');
    return JSON.parse(raw) as StepStash;
  } catch {
    return null;
  }
}

export async function clearStepStash(runId: string, stepId: string): Promise<void> {
  try {
    await fs.unlink(stashPath(runId, stepId));
  } catch {
    // ignore
  }
}

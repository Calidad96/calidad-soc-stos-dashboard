import { spawn } from 'child_process';
import path from 'path';
import { getProjectRoot } from './project-root';

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
}): Promise<{
  started: boolean;
  message?: string;
}> {
  if (state.status === 'running') {
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

  runSyncProcess()
    .then(() => {
      if (state.scheduledSlot) {
        lastScheduledSlot = state.scheduledSlot;
      }
    })
    .catch((err) => {
      state.status = 'error';
      state.finishedAt = new Date().toISOString();
      state.error = err instanceof Error ? err.message : 'Sync failed';
    });

  return { started: true };
}

async function runSyncProcess(): Promise<void> {
  const root = getProjectRoot();
  const scriptPath = path.join(root, 'src', 'scripts', 'sync-all.js');
  const output: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: root,
      env: { ...process.env },
      shell: false,
    });

    child.stdout?.on('data', (chunk: Buffer) => {
      output.push(chunk.toString());
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      output.push(chunk.toString());
    });

    child.on('error', reject);
    child.on('close', (code) => {
      const text = output.join('').trim();
      state.output = text.slice(-4000);
      state.finishedAt = new Date().toISOString();

      if (code === 0) {
        state.status = /ERROR:|Partial/i.test(text) ? 'partial' : 'success';
        resolve();
      } else {
        state.status = 'error';
        state.error = text.slice(-500) || `Sync exited with code ${code}`;
        reject(new Error(state.error));
      }
    });
  });
}

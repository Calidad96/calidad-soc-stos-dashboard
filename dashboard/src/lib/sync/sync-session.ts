import fs from 'fs';
import os from 'os';
import path from 'path';

export interface SyncRow {
  itemName: string;
  values: Record<string, string | number | undefined>;
}

export interface SyncSession {
  runId: string;
  started: string;
  totalWritten: number;
  errors: string[];
  completedSteps: string[];
}

const ROOT = path.join(os.tmpdir(), 'calidad-sync');

function ensureDir() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
}

function sessionPath(runId: string) {
  return path.join(ROOT, `${runId}.json`);
}

function stagingPath(runId: string, stepId: string) {
  return path.join(ROOT, `${runId}-${stepId}.json`);
}

export function createSession(runId: string, started: string): SyncSession {
  ensureDir();
  const session: SyncSession = {
    runId,
    started,
    totalWritten: 0,
    errors: [],
    completedSteps: [],
  };
  fs.writeFileSync(sessionPath(runId), JSON.stringify(session));
  return session;
}

export function loadSession(runId: string): SyncSession | null {
  const file = sessionPath(runId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as SyncSession;
}

export function saveSession(session: SyncSession) {
  ensureDir();
  fs.writeFileSync(sessionPath(session.runId), JSON.stringify(session));
}

export function saveStagingRows(runId: string, stepId: string, rows: SyncRow[]) {
  ensureDir();
  fs.writeFileSync(stagingPath(runId, stepId), JSON.stringify(rows));
}

export function loadStagingRows(runId: string, stepId: string): SyncRow[] {
  const file = stagingPath(runId, stepId);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')) as SyncRow[];
}

export function clearStagingRows(runId: string, stepId: string) {
  const file = stagingPath(runId, stepId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

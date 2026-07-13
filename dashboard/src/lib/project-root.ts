import path from 'path';

/** Repo root (parent of dashboard/) */
export function getProjectRoot(): string {
  return path.resolve(process.cwd(), '..');
}

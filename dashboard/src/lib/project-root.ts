import fs from 'fs';
import path from 'path';

const SYNC_PATHS = [
  path.join('scripts', 'sync-all.js'),
  path.join('src', 'scripts', 'sync-all.js'),
];

function hasSyncBundle(root: string): boolean {
  return SYNC_PATHS.some((rel) => fs.existsSync(path.join(root, rel)));
}

function resolveSyncScript(root: string): string {
  for (const rel of SYNC_PATHS) {
    const full = path.join(root, rel);
    if (fs.existsSync(full)) return full;
  }
  return path.join(root, SYNC_PATHS[0]);
}

/** Directory that contains sync scripts + data/hub-registry.json */
export function getProjectRoot(): string {
  const cwd = process.cwd();

  const parent = path.resolve(cwd, '..');
  if (hasSyncBundle(parent)) return parent;

  const bundled = path.join(cwd, 'sync');
  if (hasSyncBundle(bundled)) return bundled;

  if (hasSyncBundle(cwd)) return cwd;

  return bundled;
}

export { resolveSyncScript };

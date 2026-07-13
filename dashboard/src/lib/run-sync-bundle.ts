import { pathToFileURL } from 'url';
import fs from 'fs';
import { getProjectRoot, resolveSyncScript } from './project-root';

export async function executeSyncBundle(): Promise<string> {
  const root = getProjectRoot();
  const scriptPath = resolveSyncScript(root);

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Sync script not found: ${scriptPath}`);
  }

  const logs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;

  const capture =
    (write: typeof console.log) =>
    (...args: unknown[]) => {
      const line = args.map((a) => String(a)).join(' ');
      logs.push(line);
      write(...args);
    };

  console.log = capture(origLog);
  console.error = capture(origErr);

  try {
    const mod = await import(pathToFileURL(scriptPath).href);
    if (typeof mod.runSync !== 'function') {
      throw new Error('Sync bundle is missing runSync() export');
    }
    await mod.runSync();
    return logs.join('\n');
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

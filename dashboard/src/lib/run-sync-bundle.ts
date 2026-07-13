import { runSync } from './sync/run-sync';

export async function executeSyncBundle(): Promise<string> {
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
    await runSync();
    return logs.join('\n');
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

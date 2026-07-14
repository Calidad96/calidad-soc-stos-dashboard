function resolveAppOrigin(): string {
  if (process.env.SYNC_APP_URL) {
    return process.env.SYNC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

export function workerAuthHeader(): string | null {
  const secret = process.env.CRON_SECRET;
  return secret ? `Bearer ${secret}` : null;
}

/** Fire-and-forget chain to the background sync worker. */
export function chainSyncWorker(): void {
  const auth = workerAuthHeader();
  if (!auth) return;

  const url = `${resolveAppOrigin()}/api/sync/worker`;
  void fetch(url, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: 'chain' }),
    cache: 'no-store',
  }).catch(() => undefined);
}

export async function invokeSyncWorker(): Promise<Response | null> {
  const auth = workerAuthHeader();
  if (!auth) return null;
  const url = `${resolveAppOrigin()}/api/sync/worker`;
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: 'invoke' }),
    cache: 'no-store',
  });
}

/** Minutes to wait before each retry attempt (after timeouts / gateway errors). */
export const SYNC_RETRY_WAIT_MINUTES = [5, 10, 15, 30] as const;

export const SYNC_MAX_RETRIES = SYNC_RETRY_WAIT_MINUTES.length;

/** After a full pass still has failed boards, wait before retrying only those boards. */
export const SYNC_FAILED_PASS_WAIT_MINUTES = 30;

export function syncRetryWaitMs(attempt: number): number {
  const idx = Math.max(0, Math.min(attempt - 1, SYNC_RETRY_WAIT_MINUTES.length - 1));
  return SYNC_RETRY_WAIT_MINUTES[idx] * 60 * 1000;
}

export function syncFailedPassWaitMs(): number {
  return SYNC_FAILED_PASS_WAIT_MINUTES * 60 * 1000;
}

export function isRetryableSyncError(status: number, message: string): boolean {
  return (
    [408, 502, 503, 504].includes(status) ||
    /timed out|timeout|gateway|network|failed to fetch|econnreset|aborted/i.test(message)
  );
}

export function syncRetryLabel(attempt: number): string {
  const minutes = SYNC_RETRY_WAIT_MINUTES[Math.min(attempt - 1, SYNC_RETRY_WAIT_MINUTES.length - 1)];
  return `${minutes} min (${attempt}/${SYNC_MAX_RETRIES})`;
}

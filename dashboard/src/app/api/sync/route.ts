import { NextRequest, NextResponse } from 'next/server';
import { describeSyncSchedule, formatClientDateTime } from '@/lib/sync-schedule';
import {
  executeSyncAction,
  getSyncRunState,
  triggerSync,
} from '@/lib/sync-runner';
import { resolveLastSyncRun } from '@/lib/last-sync-run';
import { readSyncSettings } from '@/lib/sync-settings';
import { loadSyncJob, toPublicJob } from '@/lib/sync-job';
import { resumeSyncIfDue } from '@/lib/sync-orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const run = getSyncRunState();
  const settings = await readSyncSettings();
  const lastRun = await resolveLastSyncRun();
  const job = await loadSyncJob();
  const syncJob = toPublicJob(job);

  if (syncJob?.resumeDue) {
    void resumeSyncIfDue();
  }

  const displayRun =
    run.status === 'running'
      ? run
      : job?.status === 'retry_wait'
        ? {
            ...run,
            status: 'running' as const,
            progress: job.operationLabel,
            currentStep: job.operationLabel,
          }
        : job?.status === 'running'
        ? {
            ...run,
            status: 'running' as const,
            progress: job.operationLabel,
            currentStep: job.operationLabel,
          }
        : lastRun
          ? {
              ...run,
              status: lastRun.status,
              finishedAt: lastRun.finishedAt,
              error: lastRun.errors.length ? lastRun.errors.join('; ') : null,
            }
          : run;

  return NextResponse.json({
    run: displayRun,
    settings,
    scheduleLabel: describeSyncSchedule(settings),
    clientTimeNow: formatClientDateTime(settings.clientTimezone),
    lastRun,
    syncJob,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (
      body.action === 'start' ||
      body.action === 'start-worker' ||
      body.action === 'stop' ||
      body.action === 'finish' ||
      body.phase
    ) {
      const result = await executeSyncAction(body);
      return NextResponse.json({ ok: true, ...result, run: getSyncRunState() });
    }

    const result = await triggerSync();
    if (!result.started) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }
    return NextResponse.json({ started: true, run: getSyncRunState() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message, run: getSyncRunState() }, { status: 500 });
  }
}

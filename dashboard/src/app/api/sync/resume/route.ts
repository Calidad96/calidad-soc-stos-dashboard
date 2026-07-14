import { NextResponse } from 'next/server';
import { resumeSyncIfDue } from '@/lib/sync-orchestrator';
import { loadSyncJob, toPublicJob } from '@/lib/sync-job';

export const dynamic = 'force-dynamic';

/** Resume automatic sync when a retry window has passed (no secret — only continues existing jobs). */
export async function POST() {
  const job = await loadSyncJob();
  const publicJob = toPublicJob(job);
  if (!publicJob?.resumeDue) {
    return NextResponse.json({
      resumed: false,
      reason: publicJob ? 'Not due yet' : 'No pending job',
      syncJob: publicJob,
    });
  }

  const resumed = await resumeSyncIfDue();
  return NextResponse.json({ resumed, syncJob: toPublicJob(await loadSyncJob()) });
}

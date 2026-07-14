import { NextRequest, NextResponse } from 'next/server';
import { runWorkerBurst } from '@/lib/sync-orchestrator';
import { loadSyncJob } from '@/lib/sync-job';
import { chainSyncWorker, workerAuthHeader } from '@/lib/sync-worker-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!workerAuthHeader()) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  try {
    const result = await runWorkerBurst();
    if (result.shouldChain) {
      chainSyncWorker();
    }
    const job = await loadSyncJob();
    return NextResponse.json({
      ok: true,
      ...result,
      job: job
        ? {
            operationLabel: job.operationLabel,
            stepIndex: job.stepIndex,
            phase: job.phase,
            totalWritten: job.totalWritten,
            status: job.status,
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Worker failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { readSyncSettings } from '@/lib/sync-settings';
import { getSyncRunState, isSyncJobActive, triggerSync } from '@/lib/sync-runner';
import { chainSyncWorker } from '@/lib/sync-worker-client';
import { isJobActive, loadSyncJob } from '@/lib/sync-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron — once daily (Hobby plan). Schedule: 13:00 UTC ≈ 6:00 AM US Pacific (PDT). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await readSyncSettings();
  if (!settings.autoSyncEnabled) {
    return NextResponse.json({ skipped: true, reason: 'Auto sync disabled' });
  }

  const existing = await loadSyncJob();
  if (isJobActive(existing)) {
    chainSyncWorker();
    return NextResponse.json({
      resumed: true,
      reason: 'Existing job in progress — worker chained',
      run: getSyncRunState(),
    });
  }

  if (await isSyncJobActive()) {
    return NextResponse.json({ skipped: true, reason: 'Sync already running' });
  }

  const slot = new Date().toISOString().slice(0, 10);
  const result = await triggerSync({ scheduledSlot: slot });
  return NextResponse.json({
    started: result.started,
    message: result.message ?? 'Automatic sync started in background',
    slot,
    run: getSyncRunState(),
  });
}

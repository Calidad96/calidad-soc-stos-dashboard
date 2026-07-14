import { NextRequest, NextResponse } from 'next/server';
import { readSyncSettings } from '@/lib/sync-settings';
import { getSyncRunState, triggerSync } from '@/lib/sync-runner';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron — triggers reliable GitHub Actions sync (not Vercel 60s worker). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await readSyncSettings();
  if (!settings.autoSyncEnabled) {
    return NextResponse.json({ skipped: true, reason: 'Auto sync disabled' });
  }

  const slot = new Date().toISOString().slice(0, 10);
  const result = await triggerSync({ scheduledSlot: slot });
  return NextResponse.json({
    started: result.started,
    message: result.message ?? null,
    slot,
    engine: 'github-actions',
    run: getSyncRunState(),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSyncWindow } from '@/lib/sync-schedule';
import { readSyncSettings } from '@/lib/sync-settings';
import {
  getLastScheduledSlot,
  getSyncRunState,
  isSyncRunning,
  triggerSync,
} from '@/lib/sync-runner';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isSyncRunning()) {
    return NextResponse.json({ skipped: true, reason: 'Sync already running' });
  }

  const settings = await readSyncSettings();
  if (!settings.autoSyncEnabled) {
    return NextResponse.json({ skipped: true, reason: 'Auto sync disabled' });
  }

  const { inWindow, slot } = getSyncWindow(settings);
  if (!inWindow || !slot) {
    return NextResponse.json({ skipped: true, reason: 'Outside sync window' });
  }

  if (getLastScheduledSlot() === slot) {
    return NextResponse.json({ skipped: true, reason: 'Already ran for this slot' });
  }

  const result = await triggerSync({ scheduledSlot: slot, wait: true });
  return NextResponse.json({
    started: result.started,
    message: result.message ?? null,
    slot,
    run: getSyncRunState(),
  });
}

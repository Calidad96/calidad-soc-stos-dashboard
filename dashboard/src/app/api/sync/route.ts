import { NextResponse } from 'next/server';
import { describeSyncSchedule, formatClientDateTime } from '@/lib/sync-schedule';
import { getSyncRunState, triggerSync } from '@/lib/sync-runner';
import { readSyncSettings } from '@/lib/sync-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const run = getSyncRunState();
  const settings = await readSyncSettings();
  return NextResponse.json({
    run,
    settings,
    scheduleLabel: describeSyncSchedule(settings),
    clientTimeNow: formatClientDateTime(settings.clientTimezone),
  });
}

export async function POST() {
  const result = await triggerSync();
  if (!result.started) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }
  return NextResponse.json({ started: true });
}

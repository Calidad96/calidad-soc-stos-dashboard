import { NextRequest, NextResponse } from 'next/server';
import { describeSyncSchedule, formatClientDateTime } from '@/lib/sync-schedule';
import {
  executeSyncAction,
  getSyncRunState,
  triggerSync,
} from '@/lib/sync-runner';
import { readSyncSettings } from '@/lib/sync-settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'start' || body.step) {
      const result = await executeSyncAction(body);
      return NextResponse.json({ ok: true, ...result, run: getSyncRunState() });
    }

    const result = await triggerSync({ wait: true });
    if (!result.started) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }
    return NextResponse.json({ started: true, run: getSyncRunState() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message, run: getSyncRunState() }, { status: 500 });
  }
}

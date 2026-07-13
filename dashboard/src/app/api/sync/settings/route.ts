import { NextRequest, NextResponse } from 'next/server';
import { applySchedule } from '@/lib/sync-scheduler';
import { readSyncSettings, writeSyncSettings } from '@/lib/sync-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await readSyncSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await writeSyncSettings({
      autoSyncEnabled:
        typeof body.autoSyncEnabled === 'boolean'
          ? body.autoSyncEnabled
          : undefined,
      intervalMinutes:
        typeof body.intervalMinutes === 'number'
          ? body.intervalMinutes
          : undefined,
      clientTimezone:
        typeof body.clientTimezone === 'string'
          ? body.clientTimezone
          : undefined,
      syncTimeLocal:
        typeof body.syncTimeLocal === 'string'
          ? body.syncTimeLocal
          : undefined,
    });
    await applySchedule();
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid settings';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

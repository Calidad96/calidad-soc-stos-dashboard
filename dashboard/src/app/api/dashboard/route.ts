import { NextRequest, NextResponse } from 'next/server';
import { aggregateDashboard } from '@/lib/aggregate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? sp.get('month') ?? undefined;
    const data = await aggregateDashboard({ from, to });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { runSearch } from '@/lib/services/search';

export const maxDuration = 300;

export async function GET(_req: NextRequest) {
  const result = await runSearch({ trigger_type: 'cron' });
  return NextResponse.json(result);
}

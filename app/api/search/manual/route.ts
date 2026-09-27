import { NextRequest, NextResponse } from 'next/server';
import { runSearch } from '@/lib/services/search';

export const maxDuration = 300;

export async function POST(_req: NextRequest) {
  const result = await runSearch({ trigger_type: 'manual' });
  return NextResponse.json(result);
}

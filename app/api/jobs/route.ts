import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const contract_type = searchParams.get('contract_type');
  const remote_type = searchParams.get('remote_type');
  const location = searchParams.get('location');

  return NextResponse.json({
    jobs: [],
    filters: { status, source, contract_type, remote_type, location }
  });
}

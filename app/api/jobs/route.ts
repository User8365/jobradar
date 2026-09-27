import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const contract_type = searchParams.get('contract_type');
  const remote_type = searchParams.get('remote_type');
  const location = searchParams.get('location');
  const limit = Math.min(Number(searchParams.get('limit') ?? '100') || 100, 100);

  const sql = getDb();
  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (source) {
    whereClauses.push('source_id = $' + (params.length + 1));
    params.push(source);
  }
  if (contract_type) {
    whereClauses.push('contract_type = $' + (params.length + 1));
    params.push(contract_type);
  }
  if (remote_type) {
    whereClauses.push('remote_type = $' + (params.length + 1));
    params.push(remote_type);
  }
  if (location) {
    whereClauses.push('location = $' + (params.length + 1));
    params.push(location);
  }
  if (status) {
    // status is not part of the current schema; ignore unsupported filter.
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const rows = await sql.query(
    `SELECT
      id,
      source_id AS source,
      external_id,
      canonical_url AS url,
      title,
      company,
      location,
      contract_type,
      remote_type,
      published_at,
      created_at,
      raw_data
    FROM jobs
    ${whereSql}
    ORDER BY created_at DESC NULLS LAST
    LIMIT $${params.length + 1}`,
    [...params, limit],
  );

  return NextResponse.json({
    jobs: rows,
    filters: { status, source, contract_type, remote_type, location },
    count: rows.length,
  });
}

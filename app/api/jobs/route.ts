import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

const STRICT_REMOTE_EVIDENCE = ['structured_field', 'explicit_source_label', 'remote_only_source'];
const ALLOWED_STATUSES = ['new', 'seen', 'favorite', 'dismissed', 'applied'];

function addEqualityFilter(clauses: string[], params: unknown[], column: string, value: string | null) {
  if (!value) return;
  params.push(value);
  clauses.push(`${column} = $${params.length}`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q')?.trim() || null;
  const source = searchParams.get('source');
  const contractType = searchParams.get('contract_type');
  const remoteType = searchParams.get('remote_type');
  const remoteScope = searchParams.get('remote_scope');
  const status = searchParams.get('status') || 'active';
  const requestedLimit = Number(searchParams.get('limit') ?? '50');
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 50, 1), 1000);

  const sql = getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    const token = `$${params.length}`;
    clauses.push(`(title ILIKE ${token} OR company ILIKE ${token} OR location ILIKE ${token} OR description ILIKE ${token})`);
  }
  addEqualityFilter(clauses, params, 'source_id', source);
  addEqualityFilter(clauses, params, 'contract_type', contractType);

  if (remoteType) {
    addEqualityFilter(clauses, params, 'remote_type', remoteType);
    if (remoteType === 'full_remote') {
      params.push(...STRICT_REMOTE_EVIDENCE);
      clauses.push(`remote_evidence IN ($${params.length - 2}, $${params.length - 1}, $${params.length})`);
    }
  }

  if (remoteScope === 'other') {
    clauses.push("remote_scope IN ('country_list', 'timezone_restricted')");
  } else {
    addEqualityFilter(clauses, params, 'remote_scope', remoteScope);
  }

  if (status === 'active') {
    clauses.push("status <> 'dismissed'");
  } else if (ALLOWED_STATUSES.includes(status)) {
    addEqualityFilter(clauses, params, 'status', status);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows, countRows, contractRows] = await Promise.all([
    sql.query(
      `SELECT id, source_id AS source, canonical_url AS url, title, company, location,
        contract_type, remote_type, remote_scope, remote_evidence, remote_scope_text,
        salary_text, salary_min, salary_max, status, published_at, created_at
      FROM jobs ${whereSql}
      ORDER BY COALESCE(published_at, created_at) DESC NULLS LAST, id DESC
      LIMIT $${params.length + 1}`,
      [...params, limit],
    ),
    sql.query(`SELECT COUNT(*)::int AS count FROM jobs ${whereSql}`, params),
    sql.query(`SELECT DISTINCT contract_type FROM jobs
      WHERE contract_type IS NOT NULL AND BTRIM(contract_type) <> '' ORDER BY contract_type`),
  ]);

  return NextResponse.json({
    jobs: rows,
    count: Number(countRows[0]?.count ?? 0),
    options: { contractTypes: contractRows.map((row) => String(row.contract_type)) },
  });
}

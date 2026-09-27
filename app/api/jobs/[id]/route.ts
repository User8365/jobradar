import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { cleanJobDescription } from '@/lib/job-description';

const ALLOWED_STATUSES = ['new', 'seen', 'favorite', 'dismissed', 'applied'] as const;

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, source_id AS source, canonical_url AS url, title, company, location,
      contract_type, remote_type, remote_scope, remote_evidence, remote_scope_text,
      salary_text, salary_min, salary_max, description, status, published_at, created_at
    FROM jobs WHERE id = ${numericId};
  `;

  if (!rows.length) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });
  return NextResponse.json({
    job: { ...rows[0], description: cleanJobDescription(rows[0].description) },
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const numericId = Number(id);
  const body = (await req.json().catch(() => null)) as { status?: string } | null;

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
  }
  if (!body?.status || !ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    UPDATE jobs SET status = ${body.status}, updated_at = NOW()
    WHERE id = ${numericId} RETURNING id, status;
  `;

  if (!rows.length) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });
  return NextResponse.json({ job: rows[0] });
}

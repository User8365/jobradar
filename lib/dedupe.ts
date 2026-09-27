import { getDb } from './db/client';
import { NormalizedJob } from './types';
import { normalizeUrl, calculateFingerprint } from './normalize';

export async function deduplicateAndSaveJobs(jobs: NormalizedJob[]): Promise<{ newJobs: number, updatedCount: number }> {
  const sql = getDb();
  let newJobsCount = 0;
  let updatedCount = 0;

  for (const job of jobs) {
    const canonicalUrl = normalizeUrl(job.canonical_url || '');
    const fingerprint = calculateFingerprint(job.title || '', job.company || '', job.location || '');
    const normalizedJob = {
      ...job,
      canonical_url: canonicalUrl,
      raw_data: {
        ...(job.raw_data ?? {}),
        fingerprint,
        canonical_url: canonicalUrl,
      },
    };

    const existing = await sql`
      SELECT id
      FROM jobs
      WHERE canonical_url = ${canonicalUrl}
         OR fingerprint = ${fingerprint}
         OR (external_id IS NOT NULL AND source_id = ${job.source_id} AND external_id = ${job.external_id})
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE jobs
        SET
          source_id = ${normalizedJob.source_id},
          external_id = ${normalizedJob.external_id ?? null},
          canonical_url = ${canonicalUrl},
          title = ${normalizedJob.title ?? null},
          company = ${normalizedJob.company ?? null},
          location = ${normalizedJob.location ?? null},
          remote_type = ${normalizedJob.remote_type ?? null},
          contract_type = ${normalizedJob.contract_type ?? null},
          work_time = ${normalizedJob.work_time ?? null},
          salary_text = ${normalizedJob.salary_text ?? null},
          salary_min = ${normalizedJob.salary_min ?? null},
          salary_max = ${normalizedJob.salary_max ?? null},
          description = ${normalizedJob.description ?? null},
          published_at = ${normalizedJob.published_at ?? null},
          fingerprint = ${fingerprint},
          raw_data = ${JSON.stringify(normalizedJob.raw_data ?? {})}::jsonb,
          last_seen_at = NOW(),
          updated_at = NOW()
        WHERE id = ${existing[0].id};
      `;
      updatedCount++;
      continue;
    }

    const inserted = await sql`
      INSERT INTO jobs (
        source_id,
        external_id,
        canonical_url,
        title,
        company,
        location,
        remote_type,
        contract_type,
        work_time,
        salary_text,
        salary_min,
        salary_max,
        description,
        published_at,
        fingerprint,
        raw_data,
        last_seen_at
      )
      VALUES (
        ${normalizedJob.source_id},
        ${normalizedJob.external_id ?? null},
        ${canonicalUrl},
        ${normalizedJob.title ?? null},
        ${normalizedJob.company ?? null},
        ${normalizedJob.location ?? null},
        ${normalizedJob.remote_type ?? null},
        ${normalizedJob.contract_type ?? null},
        ${normalizedJob.work_time ?? null},
        ${normalizedJob.salary_text ?? null},
        ${normalizedJob.salary_min ?? null},
        ${normalizedJob.salary_max ?? null},
        ${normalizedJob.description ?? null},
        ${normalizedJob.published_at ?? null},
        ${fingerprint},
        ${JSON.stringify(normalizedJob.raw_data ?? {})}::jsonb,
        NOW()
      )
      ON CONFLICT (canonical_url) WHERE canonical_url IS NOT NULL AND canonical_url <> '' DO NOTHING
      RETURNING id;
    `;

    if (inserted.length > 0) {
      newJobsCount++;
    }
  }

  return { newJobs: newJobsCount, updatedCount };
}

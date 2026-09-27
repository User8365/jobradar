import { getDb } from './db/client';
import { NormalizedJob } from './types';
import { normalizeUrl, calculateFingerprint } from './normalize';

export async function deduplicateAndSaveJobs(jobs: NormalizedJob[]): Promise<{ newJobs: number, updatedCount: number }> {
  const sql = getDb();
  let newJobsCount = 0;
  let updatedCount = 0;

  for (const job of jobs) {
    job.canonical_url = normalizeUrl(job.canonical_url);
    const fingerprint = calculateFingerprint(job.title || '', job.company || '', job.location || '');

    const res = await sql`
      WITH existing AS (
        SELECT id FROM jobs 
        WHERE fingerprint = ${fingerprint} 
           OR canonical_url = ${job.canonical_url} 
           OR (external_id IS NOT NULL AND source_id = ${job.source_id} AND external_id = ${job.external_id})
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO jobs (source_id, external_id, canonical_url, title, company, location, remote_type, contract_type, work_time, salary_text, salary_min, salary_max, description, published_at, fingerprint, raw_data)
        SELECT ${job.source_id}, ${job.external_id}, ${job.canonical_url}, ${job.title}, ${job.company}, ${job.location}, ${job.remote_type}, ${job.contract_type}, ${job.work_time}, ${job.salary_text}, ${job.salary_min}, ${job.salary_max}, ${job.description}, ${job.published_at}, ${fingerprint}, ${JSON.stringify(job.raw_data)}::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        ON CONFLICT (fingerprint) DO UPDATE SET last_seen_at = NOW()
        RETURNING id, (xmax = 0) AS is_new
      )
      UPDATE jobs SET last_seen_at = NOW() 
      FROM existing 
      WHERE jobs.id = existing.id 
        AND NOT EXISTS (SELECT 1 FROM inserted)
      RETURNING jobs.id, false AS is_new;
    `;

    if (res.length > 0) {
      if (res[0].is_new) newJobsCount++;
      else updatedCount++;
    }
  }
  return { newJobs: newJobsCount, updatedCount };
}

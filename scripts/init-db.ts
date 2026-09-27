import { getDb } from '../lib/db/client';
import { schema } from '../lib/db/schema';

async function initializeDatabase() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      source_id TEXT,
      external_id TEXT,
      canonical_url TEXT,
      title TEXT,
      company TEXT,
      location TEXT,
      remote_type TEXT,
      remote_scope TEXT,
      remote_evidence TEXT,
      remote_scope_text TEXT,
      contract_type TEXT,
      work_time TEXT,
      salary_text TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      description TEXT,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ,
      fingerprint TEXT,
      raw_data JSONB
    );
  `;

  await sql`
    ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS source_id TEXT,
      ADD COLUMN IF NOT EXISTS external_id TEXT,
      ADD COLUMN IF NOT EXISTS canonical_url TEXT,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS company TEXT,
      ADD COLUMN IF NOT EXISTS location TEXT,
      ADD COLUMN IF NOT EXISTS remote_type TEXT,
      ADD COLUMN IF NOT EXISTS remote_scope TEXT,
      ADD COLUMN IF NOT EXISTS remote_evidence TEXT,
      ADD COLUMN IF NOT EXISTS remote_scope_text TEXT,
      ADD COLUMN IF NOT EXISTS contract_type TEXT,
      ADD COLUMN IF NOT EXISTS work_time TEXT,
      ADD COLUMN IF NOT EXISTS salary_text TEXT,
      ADD COLUMN IF NOT EXISTS salary_min INTEGER,
      ADD COLUMN IF NOT EXISTS salary_max INTEGER,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS fingerprint TEXT,
      ADD COLUMN IF NOT EXISTS raw_data JSONB;
  `;

  await sql`
    DROP INDEX IF EXISTS jobs_fingerprint_unique_idx;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS jobs_fingerprint_idx
    ON jobs (fingerprint)
    WHERE fingerprint IS NOT NULL AND fingerprint <> '';
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS jobs_canonical_url_unique_idx
    ON jobs (canonical_url)
    WHERE canonical_url IS NOT NULL AND canonical_url <> '';
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_external_unique_idx
    ON jobs (source_id, external_id)
    WHERE external_id IS NOT NULL AND external_id <> '';
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS jobs_source_external_idx
    ON jobs (source_id, external_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS jobs_canonical_url_idx
    ON jobs (canonical_url);
  `;

  console.log(`Database initialized: ${schema.jobs}`);
}

initializeDatabase().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});

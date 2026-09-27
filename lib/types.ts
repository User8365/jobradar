export type JobSource = 'adzuna' | 'apec' | 'hackernews' | 'hellowork' | 'france_travail';

export type JobStatus = 'new' | 'favorite' | 'applied' | 'dismissed' | 'archived';

export interface JobRecord {
  id: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  url: string;
  status: JobStatus;
  publishedAt: string;
  createdAt: string;
}

export interface NormalizedJob {
  source_id: string;
  external_id?: string | null;
  canonical_url: string;
  title: string;
  company: string;
  location: string;
  remote_type?: string | null;
  contract_type?: string | null;
  work_time?: string | null;
  salary_text?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  description?: string | null;
  published_at?: string | null;
  raw_data: Record<string, unknown>;
}

export type JobSource =
  | 'adzuna'
  | 'apec'
  | 'hackernews'
  | 'hellowork'
  | 'france_travail'
  | 'remote_ok'
  | 'remotive'
  | 'arbeitnow'
  | 'we_work_remotely';

export type RemoteType = 'onsite' | 'hybrid' | 'full_remote' | 'unknown';
export type RemoteScope = 'worldwide' | 'france' | 'europe' | 'country_list' | 'timezone_restricted' | 'unknown';
export type RemoteEvidence = 'structured_field' | 'explicit_source_label' | 'remote_only_source' | 'text_only' | 'none';

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
  remote_type?: RemoteType | string | null;
  remote_scope?: RemoteScope | string | null;
  remote_evidence?: RemoteEvidence | string | null;
  remote_scope_text?: string | null;
  contract_type?: string | null;
  work_time?: string | null;
  salary_text?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  description?: string | null;
  published_at?: string | null;
  raw_data: Record<string, unknown>;
}

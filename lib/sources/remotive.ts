import { classifyRemoteMetadata, normalizePublishedAt } from '../remote';
import { NormalizedJob } from '../types';

function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

function parseRemoteScope(locationText: string | null | undefined): { remote_scope: 'worldwide' | 'france' | 'europe' | 'country_list' | 'timezone_restricted' | 'unknown'; remote_scope_text: string | null } {
  const raw = (locationText ?? '').trim();
  if (!raw) return { remote_scope: 'unknown', remote_scope_text: null };
  const lower = raw.toLowerCase();
  if (/worldwide|anywhere|remote/i.test(lower)) return { remote_scope: 'worldwide', remote_scope_text: raw };
  if (/france|france only|france-based/i.test(lower)) return { remote_scope: 'france', remote_scope_text: raw };
  if (/europe|european|e.u./i.test(lower)) return { remote_scope: 'europe', remote_scope_text: raw };
  if (/utc|gmt|cest|cet|timezone|time zone/i.test(lower)) return { remote_scope: 'timezone_restricted', remote_scope_text: raw };
  if (/us|usa|uk|gb|canada|germany|spain|italy|netherlands|sweden|denmark|poland|austria|belgium|switzerland|ireland|norway/i.test(lower)) {
    return { remote_scope: 'country_list', remote_scope_text: raw };
  }
  return { remote_scope: 'unknown', remote_scope_text: raw };
}

export async function searchRemotiveJobs(query: string): Promise<NormalizedJob[]> {
  const url = new URL('https://remotive.com/api/remote-jobs');
  url.searchParams.set('search', query);
  url.searchParams.set('limit', '10');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'JobRadar/1.0',
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { jobs?: Array<Record<string, any>> };
  const jobs = payload.jobs ?? [];

  return jobs.map((job) => {
    const rawLocation = typeof job.candidate_required_location === 'string' ? job.candidate_required_location : (job.location ?? null);
    const scopeInfo = parseRemoteScope(rawLocation);
    const description = stripHtml(job.description ?? null);
    const remoteMeta = classifyRemoteMetadata({
      source_id: 'remotive',
      description,
      remote_scope: scopeInfo.remote_scope,
      remote_scope_text: scopeInfo.remote_scope_text,
      raw_data: {
        ...job,
        remote: 'remote',
        remote_scope: scopeInfo.remote_scope,
        candidate_required_location: rawLocation,
      },
    });

    return {
      source_id: 'remotive',
      external_id: String(job.id ?? job.slug ?? job.url ?? job.title),
      canonical_url: job.url || '',
      title: job.title || '',
      company: job.company_name || job.company?.name || '',
      location: rawLocation || 'Remote',
      remote_type: remoteMeta.remote_type,
      remote_scope: remoteMeta.remote_scope,
      remote_evidence: remoteMeta.remote_evidence,
      remote_scope_text: remoteMeta.remote_scope_text,
      contract_type: job.job_type || null,
      work_time: job.work_type || null,
      salary_text: typeof job.salary === 'string' ? job.salary : null,
      description,
      published_at: normalizePublishedAt(job.publication_date),
      raw_data: job,
    };
  });
}

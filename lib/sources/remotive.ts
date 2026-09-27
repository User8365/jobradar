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

  if (/\b(?:worldwide|work from anywhere|anywhere(?: only)?|worldwide only)\b/.test(lower)) {
    return { remote_scope: 'worldwide', remote_scope_text: raw };
  }

  if (/\b(?:us only|usa only|united states only|canada only|uk only|gb only|germany only|spain only|italy only|netherlands only|sweden only|denmark only|poland only|austria only|belgium only|switzerland only|ireland only|norway only)\b/.test(lower)) {
    return { remote_scope: 'country_list', remote_scope_text: raw };
  }

  if (/\b(?:france(?: only)?|france-based)\b/.test(lower)) {
    return { remote_scope: 'france', remote_scope_text: raw };
  }

  if (/\b(?:europe(?: only)?|european)\b/.test(lower) || /remote\s*-\s*europe/.test(lower)) {
    return { remote_scope: 'europe', remote_scope_text: raw };
  }

  if (/\b(?:cet|cest|gmt|utc|timezone|time zone)\b/.test(lower) || /(?:remote|anywhere).*?(?:cet|cest|gmt|utc|timezone|time zone)/.test(lower)) {
    return { remote_scope: 'timezone_restricted', remote_scope_text: raw };
  }

  if (/remote\b/.test(lower) && !/\b(?:worldwide|work from anywhere|anywhere|europe|france|us only|usa only|canada only|uk only|gb only|timezone|utc|gmt|cet|cest)\b/.test(lower)) {
    return { remote_scope: 'unknown', remote_scope_text: raw };
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

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

export async function searchArbeitnowJobs(query: string): Promise<NormalizedJob[]> {
  const url = new URL('https://www.arbeitnow.com/api/job-board-api');
  url.searchParams.set('search', query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'JobRadar/1.0',
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { data?: Array<Record<string, any>> };
  const jobs = payload.data ?? [];

  return jobs.map((job) => {
    const rawLocation = typeof job.location === 'string' ? job.location : (job.remote_location ?? null);
    const scopeInfo = parseRemoteScope(rawLocation);
    const description = stripHtml(job.description ?? null);
    const remoteValue = typeof job.remote === 'string' ? job.remote.trim().toLowerCase() : null;
    const remoteExplicit = typeof job.remote === 'boolean' ? job.remote : (remoteValue === 'remote' || remoteValue === 'fully remote' || remoteValue === 'work from anywhere');
    const hybridExplicit = remoteValue === 'hybrid';
    const remoteMeta = classifyRemoteMetadata({
      source_id: 'arbeitnow',
      description,
      remote_scope: scopeInfo.remote_scope,
      remote_scope_text: scopeInfo.remote_scope_text,
      raw_data: {
        ...job,
        location: rawLocation,
        remote: remoteValue ?? job.remote,
      },
    });

    let remoteType: 'onsite' | 'hybrid' | 'full_remote' | 'unknown' = remoteMeta.remote_type as 'onsite' | 'hybrid' | 'full_remote' | 'unknown';
    let remoteEvidence = remoteMeta.remote_evidence;

    if (hybridExplicit) {
      remoteType = 'hybrid';
      remoteEvidence = 'structured_field';
    } else if (remoteExplicit) {
      remoteType = 'full_remote';
      remoteEvidence = 'structured_field';
    }

    return {
      source_id: 'arbeitnow',
      external_id: String(job.slug ?? job.id ?? job.url ?? job.title),
      canonical_url: job.url || `https://www.arbeitnow.com/job/${job.slug ?? ''}`,
      title: job.title || '',
      company: job.company_name || '',
      location: rawLocation || 'Remote',
      remote_type: remoteType,
      remote_scope: remoteMeta.remote_scope,
      remote_evidence: remoteEvidence,
      remote_scope_text: remoteMeta.remote_scope_text,
      contract_type: job.job_type || job.contract_type || null,
      work_time: job.work_type || null,
      salary_text: job.salary || null,
      description,
      published_at: normalizePublishedAt(job.created_at ?? job.published_at ?? null),
      raw_data: job,
    };
  });
}

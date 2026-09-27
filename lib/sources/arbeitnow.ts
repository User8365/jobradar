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
    const remoteExplicit = typeof job.remote === 'boolean' ? job.remote : (typeof job.remote === 'string' ? /remote|hybrid/i.test(job.remote) : false);
    const remoteMeta = classifyRemoteMetadata({
      source_id: 'arbeitnow',
      description,
      remote_scope: scopeInfo.remote_scope,
      remote_scope_text: scopeInfo.remote_scope_text,
      raw_data: {
        ...job,
        location: rawLocation,
        remote: remoteExplicit ? 'remote' : job.remote,
      },
    });

    let remoteType = remoteMeta.remote_type;
    let remoteEvidence = remoteMeta.remote_evidence;
    if (remoteExplicit) {
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

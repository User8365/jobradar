import { classifyRemoteMetadata, normalizePublishedAt } from '../remote';
import { NormalizedJob } from '../types';

function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

function parseRemoteScope(locationText: string | null | undefined): { remote_scope: 'worldwide' | 'france' | 'europe' | 'country_list' | 'timezone_restricted' | 'unknown'; remote_scope_text: string | null } {
  const raw = (locationText ?? '').trim();
  if (!raw) {
    return { remote_scope: 'unknown', remote_scope_text: null };
  }
  const lower = raw.toLowerCase();
  if (/worldwide|anywhere|remote/i.test(lower)) return { remote_scope: 'worldwide', remote_scope_text: raw };
  if (/france|france only|france-based/i.test(lower)) return { remote_scope: 'france', remote_scope_text: raw };
  if (/europe|european|e.u./i.test(lower)) return { remote_scope: 'europe', remote_scope_text: raw };
  if (/cet|gmt|utc|timezone|time zone/i.test(lower)) return { remote_scope: 'timezone_restricted', remote_scope_text: raw };
  if (/us|usa|canada|uk|gb|germany|spain|italy|netherlands|sweden|denmark|poland|austria|belgium|switzerland|ireland|norway/i.test(lower)) {
    return { remote_scope: 'country_list', remote_scope_text: raw };
  }
  return { remote_scope: 'unknown', remote_scope_text: raw };
}

export async function searchRemoteOkJobs(query: string): Promise<NormalizedJob[]> {
  const tag = /support|informatique|it|tech|devops|sysadmin|helpdesk|service desk/.test(query.toLowerCase()) ? 'it' : 'it';
  const url = new URL('https://remoteok.com/api');
  url.searchParams.set('tag', tag);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'JobRadar/1.0',
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as Array<Record<string, any>>;
  const jobs = payload.filter((item) => item && typeof item === 'object' && item.slug && item.position);

  return jobs.map((job) => {
    const locationText = typeof job.location === 'string' ? job.location : (job.location ?? null);
    const scopeInfo = parseRemoteScope(locationText);
    const rawDescription = stripHtml(job.description ?? job.position ?? null);
    const remoteMeta = classifyRemoteMetadata({
      source_id: 'remote_ok',
      description: rawDescription,
      remote_scope: scopeInfo.remote_scope,
      remote_scope_text: scopeInfo.remote_scope_text,
      raw_data: {
        ...job,
        location: locationText,
        remote: 'remote',
        remote_scope: scopeInfo.remote_scope,
      },
    });

    const urlValue = typeof job.url === 'string' ? job.url : `https://remoteok.com/remote-jobs/${job.slug}`;
    const canonicalUrl = urlValue.startsWith('http') ? urlValue : `https://remoteok.com${urlValue}`;

    return {
      source_id: 'remote_ok',
      external_id: String(job.id ?? job.slug ?? job.position),
      canonical_url: canonicalUrl,
      title: String(job.position ?? job.slug ?? 'Remote opportunity'),
      company: typeof job.company === 'string' ? job.company : (job.company?.name ?? job.company?.display_name ?? ''),
      location: locationText || 'Remote',
      remote_type: remoteMeta.remote_type,
      remote_scope: remoteMeta.remote_scope,
      remote_evidence: remoteMeta.remote_evidence,
      remote_scope_text: remoteMeta.remote_scope_text,
      contract_type: Array.isArray(job.tags) ? (job.tags.find((tag: any) => typeof tag === 'string' && /full time|part time|contract|internship|cdi|freelance/i.test(tag)) ?? null) : null,
      work_time: Array.isArray(job.tags) ? (job.tags.find((tag: any) => typeof tag === 'string' && /full time|part time|contract|freelance|internship/i.test(tag)) ?? null) : null,
      salary_text: typeof job.salary === 'string' ? job.salary : null,
      description: rawDescription,
      published_at: normalizePublishedAt(job.epoch),
      raw_data: job,
    };
  });
}

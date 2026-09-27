import * as cheerio from 'cheerio';
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
  if (/utc|gmt|cet|cest|timezone|time zone/i.test(lower)) return { remote_scope: 'timezone_restricted', remote_scope_text: raw };
  if (/us|usa|uk|gb|canada|germany|spain|italy|netherlands|sweden|denmark|poland|austria|belgium|switzerland|ireland|norway/i.test(lower)) {
    return { remote_scope: 'country_list', remote_scope_text: raw };
  }
  return { remote_scope: 'unknown', remote_scope_text: raw };
}

function getCompanyFromTitle(title: string): string {
  const match = title.split(':')[0]?.trim();
  return match || '';
}

export async function searchWeWorkRemotelyJobs(query: string): Promise<NormalizedJob[]> {
  const url = new URL('https://weworkremotely.com/remote-jobs.rss');
  url.searchParams.set('search', query);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml, application/json',
      'User-Agent': 'JobRadar/1.0',
    },
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = $('item');
  const jobs: NormalizedJob[] = [];

  items.each((_, item) => {
    const title = $(item).find('title').text().trim();
    const link = $(item).find('link').text().trim();
    const description = stripHtml($(item).find('description').text().trim()) ?? null;
    const pubDate = $(item).find('pubDate').text().trim();
    const company = getCompanyFromTitle(title);
    const location = description ? (description.match(/(?:Location|Remote|Remote in|Region|Country):\s*([^\n]+)/i)?.[1] ?? 'Remote') : 'Remote';
    const scopeInfo = parseRemoteScope(location);
    const remoteMeta = classifyRemoteMetadata({
      source_id: 'we_work_remotely',
      description,
      remote_scope: scopeInfo.remote_scope,
      remote_scope_text: scopeInfo.remote_scope_text,
      raw_data: {
        title,
        link,
        company,
        location,
        description,
        remote: 'remote',
      },
    });

    jobs.push({
      source_id: 'we_work_remotely',
      external_id: link || title,
      canonical_url: link || '',
      title,
      company,
      location: location || 'Remote',
      remote_type: remoteMeta.remote_type,
      remote_scope: remoteMeta.remote_scope,
      remote_evidence: remoteMeta.remote_evidence,
      remote_scope_text: remoteMeta.remote_scope_text,
      contract_type: null,
      work_time: null,
      salary_text: null,
      description,
      published_at: normalizePublishedAt(pubDate),
      raw_data: {
        title,
        link,
        company,
        location,
        description,
      },
    });
  });

  return jobs.filter((job) => Boolean(job.title) && Boolean(job.canonical_url));
}

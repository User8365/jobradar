import * as cheerio from 'cheerio';
import { calculateFingerprint } from '../normalize';
import { NormalizedJob } from '../types';

function cleanUrl(rawHref: string): string {
  try {
    const url = new URL(rawHref.startsWith('http') ? rawHref : `https://www.hellowork.com${rawHref}`);
    url.hash = '';
    url.search = '';
    if (url.hostname === 'www.hellowork.com' && /\/fr-fr\/emplois\//.test(url.pathname)) {
      return url.toString();
    }
    return url.toString();
  } catch {
    return rawHref.trim();
  }
}

export async function searchHelloWorkJobs(query: string): Promise<NormalizedJob[]> {
  const url = new URL('https://www.hellowork.com/fr-fr/emploi/recherche.html');
  url.searchParams.set('keywords', query);
  url.searchParams.set('location', 'france');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; JobRadar/1.0)',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const jobs: NormalizedJob[] = [];

  $('a[href*="/fr-fr/emplois/"]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) {
      return;
    }

    const cleanHref = cleanUrl(href);
    const match = cleanHref.match(/\/fr-fr\/emplois\/(\d+)\.html$/i);
    if (!match) {
      return;
    }

    const externalId = match[1];
    const title = ($(element).text() || '').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 5 || seen.has(externalId)) {
      return;
    }

    seen.add(externalId);
    const company = '';
    const location = 'France';
    const normalizedTitle = title;
    const fingerprint = calculateFingerprint(normalizedTitle, company, location);

    jobs.push({
      source_id: 'hellowork',
      external_id: externalId,
      canonical_url: cleanHref,
      title: normalizedTitle,
      company,
      location,
      description: null,
      published_at: null,
      raw_data: { url: cleanHref, title: normalizedTitle, company, location, fingerprint },
    });
  });

  return jobs;
}

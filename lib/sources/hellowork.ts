import * as cheerio from 'cheerio';
import { NormalizedJob } from '../types';

function deriveCompany(title: string): string {
  const segments = title.split(/\s-\s|\s–\s|\s—\s/).map((segment) => segment.trim()).filter(Boolean);
  if (segments.length > 1) {
    return segments[segments.length - 1];
  }

  return '';
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
    const title = ($(element).text() || '').replace(/\s+/g, ' ').trim();

    if (!href || !title || title.length < 5) {
      return;
    }

    const finalUrl = href.startsWith('http') ? href : `https://www.hellowork.com${href}`;
    if (seen.has(finalUrl)) {
      return;
    }

    const jobId = finalUrl.match(/(\d+)\.html$/)?.[1] ?? null;
    seen.add(finalUrl);
    jobs.push({
      source_id: 'hellowork',
      external_id: jobId,
      canonical_url: finalUrl,
      title,
      company: deriveCompany(title),
      location: 'France',
      description: null,
      published_at: null,
      raw_data: { url: finalUrl, title },
    });
  });

  return jobs;
}

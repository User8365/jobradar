import * as cheerio from 'cheerio';
import { NormalizedJob } from '../types';

export async function searchApecJobs(query: string): Promise<NormalizedJob[]> {
  const url = new URL('https://www.apec.fr/career-management/job-search/jobs');
  url.searchParams.set('keywords', query);
  url.searchParams.set('location', 'France');

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
  if (/404|Aucune offre|Nous n'avons pas|pas de résultat/i.test(html)) {
    return [];
  }

  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const jobs: NormalizedJob[] = [];

  $('a[href*="/offre-emploi"], a[href*="/jobs/"], a[href*="/emploi/"]').each((_, element) => {
    const href = $(element).attr('href');
    const title = ($(element).text() || '').replace(/\s+/g, ' ').trim();

    if (!href || !title || title.length < 5) {
      return;
    }

    const finalUrl = href.startsWith('http') ? href : `https://www.apec.fr${href}`;
    if (seen.has(finalUrl)) {
      return;
    }

    seen.add(finalUrl);
    jobs.push({
      source_id: 'apec',
      external_id: null,
      canonical_url: finalUrl,
      title,
      company: '',
      location: 'France',
      description: null,
      published_at: null,
      raw_data: { url: finalUrl, title },
    });
  });

  return jobs;
}

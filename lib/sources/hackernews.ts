import { NormalizedJob } from '../types';

export async function searchHackerNewsJobs(query: string): Promise<NormalizedJob[]> {
  const response = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; JobRadar/1.0)',
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { hits?: Array<Record<string, any>> };

  return (payload.hits ?? []).map((hit) => ({
    source_id: 'hackernews',
    external_id: hit.objectID ? String(hit.objectID) : null,
    canonical_url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID || ''}`,
    title: hit.title || hit.story_title || '',
    company: hit.author || 'Hacker News',
    location: '',
    description: hit.story_text || null,
    published_at: hit.created_at || null,
    raw_data: hit,
  }));
}

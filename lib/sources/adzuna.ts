import { NormalizedJob } from '../types';

export async function searchAdzunaJobs(query: string): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return [];
  }

  const url = new URL('https://api.adzuna.com/v1/api/jobs/fr/search/1');
  url.searchParams.set('app_id', appId);
  url.searchParams.set('app_key', appKey);
  url.searchParams.set('what', query);
  url.searchParams.set('where', 'France');
  url.searchParams.set('results_per_page', '10');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'JobRadar/1.0 (+https://example.invalid)',
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { results?: Array<Record<string, any>> };

  return (payload.results ?? []).map((job) => ({
    source_id: 'adzuna',
    external_id: job.id ? String(job.id) : null,
    canonical_url: job.redirect_url || job.url || '',
    title: job.title || '',
    company: job.company?.display_name || job.company || '',
    location: job.location?.display_name || job.location || 'France',
    remote_type: typeof job.remote === 'string' ? job.remote : null,
    contract_type: job.contract_type || null,
    work_time: job.contract_time || null,
    salary_text: job.salary_is_predicted ? 'Salaire estimé' : job.salary_min || job.salary_max ? `${job.salary_min ?? ''} - ${job.salary_max ?? ''}` : null,
    salary_min: typeof job.salary_min === 'number' ? job.salary_min : null,
    salary_max: typeof job.salary_max === 'number' ? job.salary_max : null,
    description: job.description || null,
    published_at: job.created || null,
    raw_data: job,
  }));
}

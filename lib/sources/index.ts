import { NormalizedJob } from '../types';
import { searchAdzunaJobs } from './adzuna';
import { searchApecJobs } from './apec';
import { searchFranceTravailJobs } from './france-travail';
import { searchHackerNewsJobs } from './hackernews';
import { searchHelloWorkJobs } from './hellowork';

export type SourceVerdict = 'GO' | 'GO_WITH_CREDENTIALS' | 'GO_WITH_LIMITS' | 'NO_GO' | 'NOT_TESTED';

export interface SourceDescriptor {
  id: 'adzuna' | 'apec' | 'france_travail' | 'hackernews' | 'hellowork';
  name: string;
  credentialsRequired: string[];
  enabledByDefault: boolean;
  verdict: SourceVerdict;
  search: (query: string) => Promise<NormalizedJob[]>;
}

export function getSourceRegistry(): SourceDescriptor[] {
  return [
    {
      id: 'adzuna',
      name: 'Adzuna',
      credentialsRequired: ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY'],
      enabledByDefault: false,
      verdict: 'GO_WITH_CREDENTIALS',
      search: searchAdzunaJobs,
    },
    {
      id: 'france_travail',
      name: 'France Travail',
      credentialsRequired: ['FRANCE_TRAVAIL_CLIENT_ID', 'FRANCE_TRAVAIL_CLIENT_SECRET'],
      enabledByDefault: false,
      verdict: 'GO_WITH_CREDENTIALS',
      search: searchFranceTravailJobs,
    },
    {
      id: 'hellowork',
      name: 'HelloWork',
      credentialsRequired: [],
      enabledByDefault: false,
      verdict: 'GO_WITH_LIMITS',
      search: searchHelloWorkJobs,
    },
    {
      id: 'apec',
      name: 'Apec',
      credentialsRequired: [],
      enabledByDefault: false,
      verdict: 'NO_GO',
      search: searchApecJobs,
    },
    {
      id: 'hackernews',
      name: 'Hacker News',
      credentialsRequired: [],
      enabledByDefault: false,
      verdict: 'GO_WITH_LIMITS',
      search: searchHackerNewsJobs,
    },
  ];
}

export async function sourceSearchAll(query: string): Promise<NormalizedJob[]> {
  const sources = getSourceRegistry();
  const jobs: NormalizedJob[] = [];

  for (const source of sources) {
    const result = await source.search(query);
    jobs.push(...result);
  }

  return jobs;
}

export { searchAdzunaJobs } from './adzuna';
export { searchApecJobs } from './apec';
export { searchFranceTravailJobs } from './france-travail';
export { searchHackerNewsJobs } from './hackernews';
export { searchHelloWorkJobs } from './hellowork';

export * from './types';

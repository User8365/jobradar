export type SourceName = 'adzuna' | 'apec' | 'france_travail' | 'hackernews' | 'hellowork';

export interface SourceJob {
  id: string;
  source: SourceName;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  publishedAt?: string;
}

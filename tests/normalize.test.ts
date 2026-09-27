import { searchAdzunaJobs, getSourceRegistry } from '../lib/sources';

describe('normalize', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});

describe('source registry', () => {
  it('requires Adzuna credentials before live execution', async () => {
    const registry = getSourceRegistry();
    const adzuna = registry.find((source) => source.id === 'adzuna');

    expect(adzuna).toBeTruthy();
    expect(adzuna?.credentialsRequired).toEqual(['ADZUNA_APP_ID', 'ADZUNA_APP_KEY']);
    expect(adzuna?.enabledByDefault).toBe(false);

    const jobs = await searchAdzunaJobs('responsable support informatique');
    expect(jobs).toEqual([]);
  });
});

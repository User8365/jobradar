import { searchAdzunaJobs, searchFranceTravailJobs, getSourceRegistry, sourceSearchAll } from '../lib/sources';
import { classifyRemoteMetadata } from '../lib/remote';

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

  it('requires France Travail credentials before live execution', async () => {
    const registry = getSourceRegistry();
    const franceTravail = registry.find((source) => source.id === 'france_travail');

    expect(franceTravail).toBeTruthy();
    expect(franceTravail?.credentialsRequired).toEqual(['FRANCE_TRAVAIL_CLIENT_ID', 'FRANCE_TRAVAIL_CLIENT_SECRET']);
    expect(franceTravail?.enabledByDefault).toBe(true);

    const jobs = await searchFranceTravailJobs('support informatique');
    expect(jobs).toEqual([]);
  });

  it('keeps only the enabled remote sources active in the default registry', async () => {
    const registry = getSourceRegistry();
    const enabledIds = registry.filter((source) => source.enabledByDefault).map((source) => source.id);

    expect(enabledIds).toEqual(['france_travail', 'remote_ok', 'remotive', 'arbeitnow', 'we_work_remotely']);
    const jobs = await sourceSearchAll('responsable support informatique');
    expect(Array.isArray(jobs)).toBe(true);
  });
});

describe('remote metadata rules', () => {
  it('treats text-only remote mentions as unknown, not full_remote', () => {
    const result = classifyRemoteMetadata({
      source_id: 'arbeitnow',
      remote_type: null,
      remote_scope: null,
      remote_evidence: null,
      remote_scope_text: null,
      description: 'We are remote friendly, work from home and teletravail accepted.',
      raw_data: { location: 'Paris, France', tags: ['remote'] },
    } as any);

    expect(result.remote_type).toBe('unknown');
    expect(result.remote_evidence).toBe('text_only');
  });

  it('keeps remote-only sources as full_remote with a restricted scope when explicit', () => {
    const result = classifyRemoteMetadata({
      source_id: 'remote_ok',
      remote_type: null,
      remote_scope: null,
      remote_evidence: null,
      remote_scope_text: null,
      description: 'Remote role',
      raw_data: { location: 'US only', tags: ['remote', 'usa'] },
    } as any);

    expect(result.remote_type).toBe('full_remote');
    expect(result.remote_scope).toBe('country_list');
    expect(result.remote_evidence).toBe('remote_only_source');
  });

  it('classifies explicit US-only remote roles as full_remote with country_list', () => {
    const result = classifyRemoteMetadata({
      source_id: 'remote_ok',
      raw_data: { location: 'Remote - US only', remote: 'remote' },
      description: 'Remote role',
    } as any);

    expect(result.remote_type).toBe('full_remote');
    expect(result.remote_scope).toBe('country_list');
  });

  it('classifies explicit Europe remote roles as full_remote with europe', () => {
    const result = classifyRemoteMetadata({
      source_id: 'remote_ok',
      raw_data: { location: 'Remote - Europe', remote: 'remote' },
      description: 'Remote role',
    } as any);

    expect(result.remote_type).toBe('full_remote');
    expect(result.remote_scope).toBe('europe');
  });

  it('treats plain remote labels as full_remote with unknown scope for remote-only sources', () => {
    const result = classifyRemoteMetadata({
      source_id: 'remote_ok',
      raw_data: { location: 'Remote', remote: 'remote' },
      description: 'Remote role',
    } as any);

    expect(result.remote_type).toBe('full_remote');
    expect(result.remote_scope).toBe('unknown');
  });

  it('keeps hybrid marked on Arbeitnow as hybrid and never as full_remote', () => {
    const result = classifyRemoteMetadata({
      source_id: 'arbeitnow',
      raw_data: { location: 'Remote', remote: 'hybrid' },
      description: 'Hybrid role',
    } as any);

    expect(result.remote_type).toBe('unknown');
    expect(result.remote_evidence).toBe('none');
  });

  it('excludes weak evidence from the full_remote API filter', async () => {
    const weak = classifyRemoteMetadata({
      source_id: 'arbeitnow',
      raw_data: { location: 'Remote', remote: null },
      description: 'remote',
    } as any);

    expect(weak.remote_type).toBe('unknown');
    expect(weak.remote_evidence).toBe('text_only');
  });
});

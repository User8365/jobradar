import { getSourceRegistry, sourceSearchAll } from '@/lib/sources';
import { deduplicateAndSaveJobs } from '@/lib/dedupe';

export type SearchTriggerType = 'cron' | 'manual';

export async function runSearch({ trigger_type = 'manual' }: { trigger_type?: SearchTriggerType } = {}) {
  const query = 'responsable support informatique';
  const sourceResults: Array<{ source: string; status: 'ok' | 'error'; jobs: number }> = [];
  const enabledSources = getSourceRegistry().filter((source) => source.enabledByDefault === true);

  for (const source of enabledSources) {
    try {
      const jobs = await source.search(query);
      sourceResults.push({ source: source.id, status: 'ok', jobs: jobs.length });
    } catch {
      sourceResults.push({ source: source.id, status: 'error', jobs: 0 });
    }
  }

  const jobs = await sourceSearchAll(query);
  const { newJobs, updatedCount } = await deduplicateAndSaveJobs(jobs);

  return {
    success: true,
    trigger_type,
    jobsDetected: jobs.length,
    jobsAdded: newJobs,
    updatedCount,
    sourceResults,
    message: `Recherche exécutée sur ${jobs.length} résultats bruts, ${newJobs} nouvelles offres ajoutées.`
  };
}

export async function searchJobs() {
  return sourceSearchAll('responsable support informatique');
}

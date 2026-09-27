import { sourceSearchAll } from '@/lib/sources';
import { deduplicateAndSaveJobs } from '@/lib/dedupe';

export type SearchTriggerType = 'cron' | 'manual';

export async function runSearch({ trigger_type = 'manual' }: { trigger_type?: SearchTriggerType } = {}) {
  const query = 'responsable support informatique';
  const jobs = await sourceSearchAll(query);
  const { newJobs, updatedCount } = await deduplicateAndSaveJobs(jobs);

  return {
    success: true,
    trigger_type,
    jobsDetected: jobs.length,
    jobsAdded: newJobs,
    updatedCount,
    message: `Recherche exécutée sur ${jobs.length} résultats bruts, ${newJobs} nouvelles offres ajoutées.`
  };
}

export async function searchJobs() {
  return sourceSearchAll('responsable support informatique');
}

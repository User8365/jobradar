import { sourceSearchAll } from '@/lib/sources';

export type SearchTriggerType = 'cron' | 'manual';

export async function runSearch({ trigger_type = 'manual' }: { trigger_type?: SearchTriggerType } = {}) {
  const query = 'responsable support informatique';
  const jobs = await sourceSearchAll(query);

  return {
    success: true,
    trigger_type,
    jobsAdded: jobs.length,
    updatedCount: 0,
    message: `Recherche exécutée sur ${jobs.length} offres détectées sur les sources actives.`
  };
}

export async function searchJobs() {
  return sourceSearchAll('responsable support informatique');
}

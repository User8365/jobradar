export type SearchTriggerType = 'cron' | 'manual';

export async function runSearch({ trigger_type = 'manual' }: { trigger_type?: SearchTriggerType } = {}) {
  return {
    success: true,
    trigger_type,
    jobsAdded: 0,
    updatedCount: 0,
    message: 'Recherche exécutée sans données réseau configurées.'
  };
}

export async function searchJobs() {
  return [];
}

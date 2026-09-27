import { getDb } from '../db/client';

export async function syncSchedules() {
  if (!process.env.CRON_JOB_ORG_API_KEY || !process.env.APP_BASE_URL) {
    return { success: false, message: 'Clé API cron-job.org ou URL manquante.' };
  }

  const sql = getDb();
  const settings = await sql`SELECT key, value FROM settings`;
  const settingsMap = Object.fromEntries(settings.map((r: any) => [r.key, r.value]));
  const schedules = [
    settingsMap.schedule_1 || '07:00',
    settingsMap.schedule_2 || '13:00',
    settingsMap.schedule_3 || '18:30'
  ];

  let jobIds: Record<string, string> = {};
  try {
    jobIds = JSON.parse(settingsMap.cron_job_ids || '{}');
  } catch (error) {
    console.warn('cron_job_ids parse failed', error);
  }

  const headers = {
    'Authorization': `Bearer ${process.env.CRON_JOB_ORG_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  let existingJobs: any[] = [];
  try {
    const getRes = await fetch('https://api.cron-job.org/jobs', { headers });
    if (getRes.ok) existingJobs = (await getRes.json()).jobs || [];
  } catch (error) {
    console.warn('cron-job.org lookup failed', error);
  }

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < 3; i++) {
    const slot = i + 1;
    const [hour, minute] = schedules[i].split(':').map(Number);
    const title = `Job Radar - Slot ${slot}`;
    const url = `${process.env.APP_BASE_URL}/api/cron/run?slot=${slot}`;

    const payload = {
      job: {
        url,
        enabled: true,
        title,
        saveResponses: false,
        requestTimeout: 300,
        requestMethod: 0,
        schedule: {
          timezone: settingsMap.timezone || 'Europe/Paris',
          expiresAt: 0,
          hours: [hour],
          minutes: [minute],
          mdays: [-1],
          months: [-1],
          wdays: [-1]
        },
        extendedData: {
          headers: { 'Authorization': `Bearer ${process.env.CRON_TRIGGER_SECRET}` },
          body: ''
        }
      }
    };

    let jobId = jobIds[slot];
    const existing = existingJobs.find((j: any) => j.jobId === jobId || (j.title === title && j.url === url));

    try {
      if (existing) {
        const updateRes = await fetch(`https://api.cron-job.org/jobs/${existing.jobId}`, {
          method: 'PATCH', headers, body: JSON.stringify(payload)
        });
        if (updateRes.ok) {
          jobIds[slot] = existing.jobId;
          successCount++;
        } else {
          errorCount++;
          errors.push(`Slot ${slot} update failed: ${updateRes.status}`);
        }
      } else {
        if (i > 0) await new Promise(r => setTimeout(r, 1100));

        const createRes = await fetch('https://api.cron-job.org/jobs', {
          method: 'PUT', headers, body: JSON.stringify(payload)
        });
        if (createRes.ok) {
          const data = await createRes.json();
          jobIds[slot] = data.job.jobId;
          successCount++;
        } else {
          errorCount++;
          errors.push(`Slot ${slot} creation failed: ${createRes.status}`);
        }
      }
    } catch (e: any) {
      errorCount++;
      errors.push(`Slot ${slot} error: ${e.message}`);
    }
  }

  await sql`UPDATE settings SET value = ${JSON.stringify(jobIds)} WHERE key = 'cron_job_ids'`;

  if (errorCount === 0) return { success: true, message: '3 tâches synchronisées avec cron-job.org' };
  if (successCount > 0) return { success: 'partial_failure', message: `Synchronisation partielle: ${errors.join(', ')}` };
  return { success: false, message: `Échec total: ${errors.join(', ')}` };
}

export async function scheduleJob() {
  return { ok: true };
}

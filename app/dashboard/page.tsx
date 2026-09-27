import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

async function getDashboardJobs() {
  const sql = getDb();
  return sql`
    SELECT
      id,
      source_id AS source,
      title,
      company,
      location,
      contract_type,
      canonical_url AS url,
      created_at
    FROM jobs
    ORDER BY created_at DESC
    LIMIT 100;
  `;
}

export default async function DashboardPage() {
  const jobs = await getDashboardJobs();

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      {jobs.length === 0 ? (
        <p className="text-sm text-gray-600">Aucune offre pour le moment.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Titre</th>
                <th className="px-3 py-2">Entreprise</th>
                <th className="px-3 py-2">Localisation</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Lien</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job: any) => (
                <tr key={job.id} className="border-t border-gray-200">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(job.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-2">{job.title}</td>
                  <td className="px-3 py-2">{job.company || '—'}</td>
                  <td className="px-3 py-2">{job.location || '—'}</td>
                  <td className="px-3 py-2">{job.source}</td>
                  <td className="px-3 py-2">
                    {job.url ? <a href={job.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Voir</a> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

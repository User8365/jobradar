import { NormalizedJob } from '../types';

export async function searchFranceTravailJobs(query: string): Promise<NormalizedJob[]> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  const tokenUrl = 'https://api.francetravail.io/oauth2/token';
  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: process.env.FRANCE_TRAVAIL_SCOPE || 'api_offresdemploi',
  });

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: tokenBody.toString(),
  });

  if (!tokenResponse.ok) {
    return [];
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; expires_in?: number; token_type?: string };
  const accessToken = tokenPayload.access_token;

  if (!accessToken) {
    return [];
  }

  const searchUrl = new URL('https://api.francetravail.io/partenaire/offresdemploi/v1/offres/search');
  const params = new URLSearchParams({
    motCle: query,
    range: '0-20',
  });
  searchUrl.search = params.toString();

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'JobRadar/1.0',
    },
  });

  if (!searchResponse.ok) {
    return [];
  }

  const payload = (await searchResponse.json()) as { resultats?: Array<Record<string, any>> };
  const results = payload.resultats ?? [];

  return results.map((job) => ({
    source_id: 'france_travail',
    external_id: job.idOffre || job.id || null,
    canonical_url: job.origineOffre?.url || job.origineOffre?.lien || job.url || '',
    title: job.intitule || '',
    company: job.entreprise?.nom || job.entreprise?.denomination || '',
    location: job.lieuTravail?.libelle || job.lieuTravail?.codePostal || 'France',
    contract_type: job.typeContrat || null,
    work_time: job.dureeTravailLibelle || null,
    salary_text: job.remuneration?.libelle || null,
    salary_min: typeof job.remuneration?.salaireMin === 'number' ? job.remuneration.salaireMin : null,
    salary_max: typeof job.remuneration?.salaireMax === 'number' ? job.remuneration.salaireMax : null,
    description: job.description || job.descriptionCourte || null,
    published_at: job.dateCreation || job.datePublication || null,
    raw_data: job,
  }));
}

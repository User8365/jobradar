import { NormalizedJob } from '../types';

export async function searchFranceTravailJobs(query: string): Promise<NormalizedJob[]> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  const tokenUrl = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';
  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'api_offresdemploiv2 o2dsoffre',
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
    const errorPayload = (await tokenResponse.json().catch(() => ({}))) as { error?: string; error_description?: string };
    const errorText = errorPayload.error || 'unknown_error';
    const errorDescription = errorPayload.error_description || 'No error description returned';
    console.error('France Travail OAuth failed:', { status: tokenResponse.status, error: errorText, error_description: errorDescription });
    return [];
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; expires_in?: number; token_type?: string };
  const accessToken = tokenPayload.access_token;

  if (!accessToken) {
    return [];
  }

  const searchUrl = new URL('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search');
  const params = new URLSearchParams({
    motsCles: query,
    range: '0-19',
  });
  searchUrl.search = params.toString();

  const searchResponse = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!searchResponse.ok) {
    const errorPayload = (await searchResponse.json().catch(() => ({}))) as { error?: string; error_description?: string };
    const errorText = errorPayload.error || 'unknown_error';
    const errorDescription = errorPayload.error_description || 'No error description returned';
    console.error('France Travail search failed:', { status: searchResponse.status, error: errorText, error_description: errorDescription });
    return [];
  }

  const payload = (await searchResponse.json()) as { resultats?: Array<Record<string, any>> };
  const results = payload.resultats ?? [];

  return results.map((job) => {
    const offerId = job.idOffre || job.id || null;
    const canonicalUrl =
      job.origineOffre?.urlOrigine ||
      (offerId ? `https://candidat.francetravail.fr/offres/recherche/detail/${offerId}` : '') ||
      job.origineOffre?.url ||
      job.origineOffre?.lien ||
      job.url ||
      '';

    return {
      source_id: 'france_travail',
      external_id: offerId,
      canonical_url: canonicalUrl,
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
    };
  });
}

export type RemoteType = 'onsite' | 'hybrid' | 'full_remote' | 'unknown';
export type RemoteScope = 'worldwide' | 'france' | 'europe' | 'country_list' | 'timezone_restricted' | 'unknown';
export type RemoteEvidence = 'structured_field' | 'explicit_source_label' | 'remote_only_source' | 'text_only' | 'none';

export interface RemoteClassificationInput {
  source_id?: string | null;
  remote_type?: string | null;
  remote_scope?: string | null;
  remote_evidence?: string | null;
  remote_scope_text?: string | null;
  description?: string | null;
  raw_data?: Record<string, any>;
}

function normalizeRemoteValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = String(value).trim().toLowerCase();
  if (!cleaned) return null;
  return cleaned;
}

export function normalizePublishedAt(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestamp = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      return normalizePublishedAt(asNumber);
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

export function classifyRemoteMetadata(input: RemoteClassificationInput) {
  const description = (input.description ?? '').toLowerCase();
  const raw = input.raw_data ?? {};
  const structuredRemote = normalizeRemoteValue(raw.remote ?? raw.remote_type ?? raw.work_model ?? raw.location_type ?? raw.type ?? null);
  const sourceLabel = normalizeRemoteValue(raw.source_label ?? raw.remote_label ?? raw.job_type ?? null);
  const remoteOnlySource = ['remote_ok', 'remotive', 'we_work_remotely'].includes(String(input.source_id ?? ''));

  const explicitRemote = structuredRemote && ['remote', 'fully-remote', 'full_remote', 'remote-only', 'telecommute', 'home office'].includes(structuredRemote);
  const labelSuggestsRemote = sourceLabel && ['remote', 'fully remote', 'remote-only', 'work from anywhere', 'worldwide remote'].includes(sourceLabel);

  let remote_type: RemoteType = 'unknown';
  let remote_evidence: RemoteEvidence = 'none';
  let remote_scope: RemoteScope = 'unknown';
  let remote_scope_text: string | null = input.remote_scope_text ?? null;

  if (remoteOnlySource) {
    remote_type = 'full_remote';
    remote_evidence = 'remote_only_source';
  } else if (explicitRemote) {
    remote_type = 'full_remote';
    remote_evidence = 'structured_field';
  } else if (labelSuggestsRemote) {
    remote_type = 'full_remote';
    remote_evidence = 'explicit_source_label';
  } else if (description.includes('remote') || description.includes('teletravail') || description.includes('work from home') || description.includes('home office')) {
    remote_type = 'unknown';
    remote_evidence = 'text_only';
  }

  if (raw.location && typeof raw.location === 'string') {
    const location = raw.location.toLowerCase();
    if (location.includes('worldwide') || location.includes('anywhere')) remote_scope = 'worldwide';
    else if (location.includes('france')) remote_scope = 'france';
    else if (location.includes('europe') || location.includes('eu')) remote_scope = 'europe';
    else if (location.includes('us only') || location.includes('usa only') || location.includes('canada only')) remote_scope = 'country_list';
    else if (location.includes('cest') || location.includes('cet') || location.includes('timezone') || location.includes('utc')) remote_scope = 'timezone_restricted';
  }

  if (input.remote_scope && input.remote_scope !== 'unknown') {
    remote_scope = input.remote_scope as RemoteScope;
  }

  if (remote_scope === 'unknown' && typeof raw.remote_scope === 'string') {
    remote_scope = raw.remote_scope as RemoteScope;
  }

  if (remote_scope === 'unknown' && typeof input.remote_scope_text === 'string' && input.remote_scope_text.trim()) {
    remote_scope_text = input.remote_scope_text.trim();
  }

  if (remote_type === 'unknown' && remote_evidence === 'text_only') {
    remote_scope = 'unknown';
  }

  return {
    remote_type,
    remote_scope,
    remote_evidence,
    remote_scope_text,
  };
}

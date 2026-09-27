'use client';

import {
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clipboard,
  ExternalLink,
  Heart,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Wifi,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

type JobStatus = 'new' | 'seen' | 'favorite' | 'dismissed' | 'applied';

type Job = {
  id: number;
  source: string | null;
  url: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  contract_type: string | null;
  remote_type: string | null;
  remote_scope: string | null;
  remote_evidence: string | null;
  remote_scope_text: string | null;
  salary_text: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  status: JobStatus;
  published_at: string | null;
  created_at: string;
};

type JobsResponse = {
  jobs: Job[];
  count: number;
  options: { contractTypes: string[] };
};

type Filters = {
  q: string;
  source: string;
  contractType: string;
  remoteType: string;
  remoteScope: string;
  status: string;
};

const INITIAL_FILTERS: Filters = {
  q: '',
  source: '',
  contractType: '',
  remoteType: '',
  remoteScope: '',
  status: 'active',
};

const SOURCE_LABELS: Record<string, string> = {
  france_travail: 'France Travail',
  remote_ok: 'Remote OK',
  remotive: 'Remotive',
  arbeitnow: 'Arbeitnow',
  we_work_remotely: 'We Work Remotely',
};

const REMOTE_LABELS: Record<string, string> = {
  full_remote: 'Full remote',
  hybrid: 'Hybride',
  onsite: 'Sur site',
  unknown: 'Inconnu',
};

const SCOPE_LABELS: Record<string, string> = {
  france: 'France',
  europe: 'Europe',
  worldwide: 'Worldwide',
  country_list: 'Pays restreints',
  timezone_restricted: 'Fuseaux restreints',
  unknown: 'Inconnu',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  new: 'Nouveau',
  seen: 'Vu',
  favorite: 'Favori',
  dismissed: 'Ignoré',
  applied: 'Candidaté',
};

function sourceLabel(source: string | null) {
  return source ? SOURCE_LABELS[source] ?? source : 'Source inconnue';
}

function remoteLabel(type: string | null) {
  return REMOTE_LABELS[type ?? 'unknown'] ?? 'Inconnu';
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const compared = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((current.getTime() - compared.getTime()) / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}

function displayLocation(job: Job) {
  if (job.remote_type === 'full_remote') {
    const scope = job.remote_scope_text?.trim() || SCOPE_LABELS[job.remote_scope ?? 'unknown'];
    return scope && scope !== 'Inconnu' ? `Remote — ${scope}` : 'Remote';
  }
  return job.location?.trim() || 'Localisation non renseignée';
}

function displaySalary(job: Job) {
  if (job.salary_text?.trim()) return job.salary_text;
  if (job.salary_min || job.salary_max) {
    const formatter = new Intl.NumberFormat('fr-FR');
    if (job.salary_min && job.salary_max) return `${formatter.format(job.salary_min)} – ${formatter.format(job.salary_max)}`;
    return formatter.format(job.salary_min ?? job.salary_max ?? 0);
  }
  return 'Non renseigné';
}

function copyText(job: Job) {
  return [
    `Titre : ${job.title || 'Non renseigné'}`,
    `Entreprise : ${job.company || 'Entreprise non renseignée'}`,
    `Localisation : ${displayLocation(job)}`,
    `Contrat : ${job.contract_type || 'Non renseigné'}`,
    `Mode : ${remoteLabel(job.remote_type)}`,
    `Source : ${sourceLabel(job.source)}`,
    `URL : ${job.url || 'Non renseignée'}`,
    '',
    'Description :',
    job.description?.trim() || 'Description non renseignée',
  ].join('\n');
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white py-0 pl-3 pr-9 text-[13px] font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
    </label>
  );
}

function ModeBadge({ type }: { type: string | null }) {
  const normalized = type ?? 'unknown';
  return (
    <span className={clsx('mode-badge', `mode-badge--${normalized}`)}>
      {remoteLabel(normalized)}
    </span>
  );
}

export default function DashboardClient() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(50);
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestId = useRef(0);

  const selectedJob = useMemo(() => {
    if (detailJob?.id === selectedId) return detailJob;
    return jobs.find((job) => job.id === selectedId) ?? null;
  }, [detailJob, jobs, selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(filters.q.trim());
      setLimit(50);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  const loadJobs = useCallback(async (manual = false) => {
    const activeRequest = ++requestId.current;
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: String(limit), status: filters.status });
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (filters.source) params.set('source', filters.source);
    if (filters.contractType) params.set('contract_type', filters.contractType);
    if (filters.remoteType) params.set('remote_type', filters.remoteType);
    if (filters.remoteScope) params.set('remote_scope', filters.remoteScope);

    try {
      const response = await fetch(`/api/jobs?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Impossible de charger les offres.');
      const data = (await response.json()) as JobsResponse;
      if (activeRequest !== requestId.current) return;
      setJobs(data.jobs);
      setCount(data.count);
      setContractTypes(data.options.contractTypes);
      setSelectedId((current) => current && data.jobs.some((job) => job.id === current) ? current : null);
    } catch (loadError) {
      if (activeRequest === requestId.current) {
        setError(loadError instanceof Error ? loadError.message : 'Une erreur est survenue.');
      }
    } finally {
      if (activeRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedQuery, filters.contractType, filters.remoteScope, filters.remoteType, filters.source, filters.status, limit]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key !== 'q') setLimit(50);
  };

  const updateStatus = async (job: Job, status: JobStatus) => {
    const previousStatus = job.status;
    setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status } : item));
    setDetailJob((current) => current?.id === job.id ? { ...current, status } : current);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error();
      if (filters.status === 'active' && status === 'dismissed') {
        setJobs((current) => current.filter((item) => item.id !== job.id));
        setCount((current) => Math.max(0, current - 1));
        if (selectedId === job.id) setSelectedId(null);
      }
    } catch {
      setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: previousStatus } : item));
      setDetailJob((current) => current?.id === job.id ? { ...current, status: previousStatus } : current);
      setError("Le statut n'a pas pu être enregistré.");
    }
  };

  const openJob = async (job: Job) => {
    setSelectedId(job.id);
    setDetailJob(null);
    setDetailLoading(true);
    setCopied(false);
    if (job.status === 'new') await updateStatus(job, 'seen');
    try {
      const response = await fetch(`/api/jobs/${job.id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { job: Job };
      setDetailJob(data.job);
    } catch {
      setError("Le détail de l'offre n'a pas pu être chargé.");
    } finally {
      setDetailLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setDebouncedQuery('');
    setLimit(50);
  };

  const copyJob = async (job: Job) => {
    await navigator.clipboard.writeText(copyText(job));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className={clsx('dashboard-shell', selectedJob && 'dashboard-shell--detail')}>
        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-wrap items-center gap-3">
            <h1 className="mr-1 text-2xl font-bold tracking-[-0.035em] sm:text-[28px]">Job Radar</h1>
            <span className="text-sm tabular-nums text-slate-500">{count.toLocaleString('fr-FR')} offre{count > 1 ? 's' : ''}</span>
            <button
              type="button"
              onClick={() => void loadJobs(true)}
              disabled={refreshing}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={clsx('size-4', refreshing && 'animate-spin')} />
              Actualiser
            </button>
          </header>

          <div className="mb-5 space-y-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto]">
              <label className="relative block">
                <span className="sr-only">Rechercher</span>
                <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={filters.q}
                  onChange={(event) => updateFilter('q', event.target.value)}
                  placeholder="Rechercher un poste, une entreprise, une localisation…"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="mode-tabs" role="group" aria-label="Mode de travail">
                {[
                  ['', 'Tous'],
                  ['full_remote', 'Full remote'],
                  ['hybrid', 'Hybride'],
                  ['onsite', 'Sur site'],
                  ['unknown', 'Inconnu'],
                ].map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={filters.remoteType === value}
                    onClick={() => updateFilter('remoteType', value)}
                    className={clsx('mode-tab', filters.remoteType === value && 'mode-tab--active')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SelectField label="Source" value={filters.source} onChange={(value) => updateFilter('source', value)}>
                <option value="">Toutes les sources</option>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </SelectField>
              <SelectField label="Contrat" value={filters.contractType} onChange={(value) => updateFilter('contractType', value)}>
                <option value="">Tous les contrats</option>
                {contractTypes.map((value) => <option key={value} value={value}>{value}</option>)}
              </SelectField>
              <SelectField label="Zone remote" value={filters.remoteScope} onChange={(value) => updateFilter('remoteScope', value)}>
                <option value="">Toutes les zones</option>
                <option value="france">France</option>
                <option value="europe">Europe</option>
                <option value="worldwide">Worldwide</option>
                <option value="other">Autres / restrictions</option>
                <option value="unknown">Inconnu</option>
              </SelectField>
              <SelectField label="Statut" value={filters.status} onChange={(value) => updateFilter('status', value)}>
                <option value="active">Statuts actifs</option>
                <option value="all">Tous les statuts</option>
                <option value="new">Nouveau</option>
                <option value="seen">Vu</option>
                <option value="favorite">Favori</option>
                <option value="dismissed">Ignoré</option>
                <option value="applied">Candidaté</option>
              </SelectField>
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <CircleAlert className="size-4 shrink-0" /> {error}
            </div>
          )}

          <div className="job-table-wrap">
            <table className="job-table">
              <thead>
                <tr>
                  <th>Offre</th>
                  <th className="column-mobile-hide">Localisation</th>
                  <th className="column-secondary">Contrat</th>
                  <th>Mode</th>
                  <th>Source</th>
                  <th className="column-secondary">Publication</th>
                  <th className="column-mobile-hide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="h-40 text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-blue-600" /><span className="sr-only">Chargement</span></td></tr>
                ) : jobs.length ? jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={clsx(job.status === 'new' && 'job-row--new', selectedId === job.id && 'job-row--selected')}
                    onClick={() => void openJob(job)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void openJob(job);
                      }
                    }}
                  >
                    <td>
                      <div className="flex min-w-[190px] items-center gap-3">
                        <span className={clsx('size-2 shrink-0 rounded-full', job.status === 'new' ? 'bg-blue-600' : 'bg-transparent')} aria-hidden />
                        <div className="min-w-0">
                          <div className={clsx('truncate text-sm text-slate-950', job.status === 'new' ? 'font-bold' : 'font-semibold')}>{job.title || 'Titre non renseigné'}</div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">{job.company || 'Entreprise non renseignée'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="column-mobile-hide"><span className="line-clamp-2 min-w-[130px] text-slate-600">{displayLocation(job)}</span></td>
                    <td className="column-secondary"><span className="contract-badge">{job.contract_type || 'Non renseigné'}</span></td>
                    <td><ModeBadge type={job.remote_type} /></td>
                    <td><span className="source-badge">{sourceLabel(job.source)}</span></td>
                    <td className="column-secondary whitespace-nowrap text-slate-500">{formatDate(job.published_at) || '—'}</td>
                    <td className="column-mobile-hide">
                      <div className="flex justify-end gap-0.5">
                        <button type="button" title="Mettre en favori" aria-label="Mettre en favori" onClick={(event) => { event.stopPropagation(); void updateStatus(job, 'favorite'); }} className={clsx('row-action', job.status === 'favorite' && 'row-action--favorite')}><Heart className="size-[18px]" fill={job.status === 'favorite' ? 'currentColor' : 'none'} /></button>
                        <button type="button" title="Ignorer" aria-label="Ignorer" onClick={(event) => { event.stopPropagation(); void updateStatus(job, 'dismissed'); }} className={clsx('row-action', job.status === 'dismissed' && 'row-action--dismissed')}><Ban className="size-[18px]" /></button>
                        <button type="button" title="Marquer comme candidaté" aria-label="Marquer comme candidaté" onClick={(event) => { event.stopPropagation(); void updateStatus(job, 'applied'); }} className={clsx('row-action', job.status === 'applied' && 'row-action--applied')}><BriefcaseBusiness className="size-[18px]" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="h-56 text-center">
                      <p className="text-sm font-medium text-slate-700">Aucune offre ne correspond à ces filtres.</p>
                      <button type="button" onClick={resetFilters} className="mt-3 text-sm font-semibold text-blue-700 hover:underline">Réinitialiser les filtres</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && jobs.length > 0 && (
            <footer className="flex items-center justify-between gap-4 py-4 text-sm text-slate-500">
              <span>1–{jobs.length} sur {count.toLocaleString('fr-FR')} offre{count > 1 ? 's' : ''}</span>
              {jobs.length < count && (
                <button type="button" onClick={() => setLimit((current) => current + 50)} className="h-10 rounded-lg border border-slate-300 bg-white px-5 font-semibold text-slate-800 shadow-sm hover:bg-slate-50">Afficher plus</button>
              )}
            </footer>
          )}
        </section>

        {selectedJob && (
          <aside className="detail-panel" aria-label="Détail de l'offre">
            <div className="detail-panel__scroll">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold leading-7 tracking-[-0.025em]">{selectedJob.title || 'Titre non renseigné'}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-600">{selectedJob.company || 'Entreprise non renseignée'}</p>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="-mr-2 -mt-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Fermer le détail"><X className="size-5" /></button>
              </div>

              <dl className="detail-list">
                <div><dt><ExternalLink />Source</dt><dd>{sourceLabel(selectedJob.source)}</dd></div>
                <div><dt><MapPin />Localisation</dt><dd>{displayLocation(selectedJob)}</dd></div>
                <div><dt><BriefcaseBusiness />Contrat</dt><dd>{selectedJob.contract_type || 'Non renseigné'}</dd></div>
                <div><dt><Wifi />Mode de travail</dt><dd>{remoteLabel(selectedJob.remote_type)}</dd></div>
                <div><dt><Wifi />Restriction remote</dt><dd>{selectedJob.remote_scope_text || SCOPE_LABELS[selectedJob.remote_scope ?? 'unknown'] || 'Inconnu'}</dd></div>
                <div><dt><CalendarDays />Publication</dt><dd>{formatDate(selectedJob.published_at) || 'Date non renseignée'}</dd></div>
                <div><dt><span className="detail-currency">€</span>Salaire</dt><dd>{displaySalary(selectedJob)}</dd></div>
                <div><dt><Check />Statut</dt><dd>{STATUS_LABELS[selectedJob.status]}</dd></div>
              </dl>

              <section className="border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold text-slate-950">Description</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {detailLoading ? 'Chargement de la description…' : selectedJob.description?.trim() || 'Description non renseignée.'}
                </p>
              </section>
            </div>

            <div className="detail-panel__actions">
              <button type="button" onClick={() => void copyJob(selectedJob)} className="detail-button detail-button--secondary">
                {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                {copied ? 'Copié' : 'Copier pour ChatGPT'}
              </button>
              {selectedJob.url ? (
                <a href={selectedJob.url} target="_blank" rel="noreferrer" className="detail-button detail-button--primary">Voir l’annonce <ExternalLink className="size-4" /></a>
              ) : (
                <span className="detail-button detail-button--disabled">Lien indisponible</span>
              )}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

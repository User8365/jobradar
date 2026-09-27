import {
  searchAdzunaJobs,
  searchApecJobs,
  searchHackerNewsJobs,
  searchHelloWorkJobs,
} from '../lib/sources';

async function run(source: string, fn: (query: string) => Promise<any[]>, query: string) {
  const jobs = await fn(query);
  return {
    source,
    raw: jobs.length,
    first: jobs.slice(0, 3).map((job) => ({
      source_id: job.source_id,
      title: job.title,
      company: job.company,
      location: job.location,
      canonical_url: job.canonical_url,
    })),
  };
}

async function main() {
  const query = 'responsable support informatique';

  const results = await Promise.all([
    run('Adzuna', searchAdzunaJobs, query),
    run('HelloWork', searchHelloWorkJobs, query),
    run('Apec', searchApecJobs, query),
    run('Hacker News', searchHackerNewsJobs, `${query} france`),
  ]);

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

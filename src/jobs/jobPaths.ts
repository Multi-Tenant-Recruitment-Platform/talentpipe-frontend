import type { JobSummary } from '../api/types';

/**
 * Job links read "/jobs/<title>-<company>", e.g. /jobs/data-analyst-northwind-analytics.
 * The backend's slug is used when it sends one (it must keep slugs unique);
 * otherwise the slug is derived from the title and company name.
 */

const MAX_SLUG = 80;

type SlugSource = Pick<JobSummary, 'id' | 'title' | 'companyName' | 'slug'>;

export function jobSlug(job: Pick<JobSummary, 'title' | 'companyName'>): string {
  const slug = `${job.title} ${job.companyName}`
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= MAX_SLUG) return slug;
  const cut = slug.slice(0, MAX_SLUG);
  const lastBreak = cut.lastIndexOf('-');
  return lastBreak > 0 ? cut.slice(0, lastBreak) : cut;
}

/** What identifies the job in its URL. Falls back to the id when the title has no latin letters. */
export const jobUrlKey = (job: SlugSource) => job.slug || jobSlug(job) || job.id;

export const jobPath = (job: SlugSource) => `/jobs/${encodeURIComponent(jobUrlKey(job))}`;
export const jobApplyPath = (job: SlugSource) => `${jobPath(job)}/apply`;

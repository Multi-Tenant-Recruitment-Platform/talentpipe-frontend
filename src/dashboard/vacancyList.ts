import type { JobVacancyResponse, VacancyStatus } from '../api/types';
import { daysBetween, todayIso } from './jobVacancy';

/**
 * Searching, filtering, counting and sorting the vacancy list.
 *
 * <p>Client-side over the whole workspace, the same arrangement as the team
 * roster (`teamRoster.ts`): `jobsApi.list` returns every vacancy, and a
 * workspace has tens of them, not tens of thousands. Doing it here is what
 * lets every segment show an honest count without a second endpoint. If the
 * numbers ever outgrow that, the contract doc describes the server-side query
 * parameters that replace this file.</p>
 *
 * <p>The query lives in the URL, so a filtered list survives a reload, can be
 * linked to, and is restored by Back from a vacancy's page.</p>
 */

export type VacancySegment = 'all' | VacancyStatus;
export type VacancySort = 'newest' | 'updated' | 'deadline' | 'title';

export interface VacancyQuery {
  segment: VacancySegment;
  query: string;
  /** '' means every department. */
  department: string;
  sort: VacancySort;
}

export const DEFAULT_VACANCY_QUERY: VacancyQuery = {
  segment: 'all',
  query: '',
  department: '',
  sort: 'newest',
};

/** In display order. "All" excludes Archived — see {@link inSegment}. */
export const VACANCY_SEGMENTS: { id: VacancySegment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'ARCHIVED', label: 'Archived' },
];

export const VACANCY_SORTS: { id: VacancySort; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'deadline', label: 'Deadline (soonest)' },
  { id: 'title', label: 'Title A–Z' },
];

/**
 * Whether a vacancy belongs to a segment.
 *
 * <p>"All" means every *active* vacancy — everything but Archived. Archiving
 * exists to take a vacancy out of the lists people work from (PB-022); if it
 * still appeared under the default view, archiving would do nothing a
 * recruiter could see. Archived has its own segment so nothing is lost.</p>
 */
export function inSegment(vacancy: JobVacancyResponse, segment: VacancySegment): boolean {
  return segment === 'all' ? vacancy.status !== 'ARCHIVED' : vacancy.status === segment;
}

/* --- URL ----------------------------------------------------------------- */

const SEGMENT_PARAM: Record<VacancySegment, string> = {
  all: 'all',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

/**
 * Reads the list query from the address bar. Anything unrecognised falls back
 * to the default rather than throwing — a hand-edited or stale link should land
 * on a working list, not an error.
 */
export function parseVacancyQuery(params: URLSearchParams): VacancyQuery {
  const status = params.get('status') ?? '';
  const segment =
    (Object.entries(SEGMENT_PARAM).find(([, value]) => value === status)?.[0] as
      | VacancySegment
      | undefined) ?? DEFAULT_VACANCY_QUERY.segment;
  const sortParam = params.get('sort') ?? '';
  const sort = VACANCY_SORTS.some((option) => option.id === sortParam)
    ? (sortParam as VacancySort)
    : DEFAULT_VACANCY_QUERY.sort;
  return {
    segment,
    query: params.get('q') ?? '',
    department: params.get('dept') ?? '',
    sort,
  };
}

/** Writes the query back, omitting defaults so a plain list keeps a plain URL. */
export function toVacancySearchParams(query: VacancyQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.segment !== DEFAULT_VACANCY_QUERY.segment) {
    params.set('status', SEGMENT_PARAM[query.segment]);
  }
  if (query.query !== '') {
    params.set('q', query.query);
  }
  if (query.department !== '') {
    params.set('dept', query.department);
  }
  if (query.sort !== DEFAULT_VACANCY_QUERY.sort) {
    params.set('sort', query.sort);
  }
  return params;
}

/* --- Selection ----------------------------------------------------------- */

export interface VacancySelection {
  visible: JobVacancyResponse[];
  /** After search and department, before the segment — so "Draft 3" says what clicking it shows. */
  counts: Record<VacancySegment, number>;
  /** True when anything but the default view is applied. */
  filtersActive: boolean;
}

function searchText(vacancy: JobVacancyResponse): string {
  return [
    vacancy.title,
    vacancy.department,
    vacancy.location,
    ...(vacancy.requiredSkills ?? []),
    ...(vacancy.preferredSkills ?? []),
  ]
    .join(' ')
    .toLowerCase();
}

/** Epoch millis for sorting; an unparseable timestamp sorts as the oldest. */
const time = (iso: string | null | undefined) => {
  const value = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(value) ? 0 : value;
};

function compare(a: JobVacancyResponse, b: JobVacancyResponse, sort: VacancySort): number {
  switch (sort) {
    case 'newest':
      return time(b.createdAt) - time(a.createdAt);
    case 'updated':
      return time(b.updatedAt) - time(a.updatedAt);
    case 'deadline':
      // A vacancy without a deadline has nothing to be soon about — last.
      if (!a.applicationDeadline || !b.applicationDeadline) {
        return Number(!a.applicationDeadline) - Number(!b.applicationDeadline);
      }
      return a.applicationDeadline.localeCompare(b.applicationDeadline);
    case 'title':
      return (a.title || '').localeCompare(b.title || '');
  }
}

export function selectVacancies(
  vacancies: JobVacancyResponse[],
  query: VacancyQuery,
): VacancySelection {
  const needle = query.query.trim().toLowerCase();
  const matched = vacancies.filter(
    (vacancy) =>
      (query.department === '' || vacancy.department === query.department) &&
      (needle === '' || searchText(vacancy).includes(needle)),
  );

  const counts = Object.fromEntries(
    VACANCY_SEGMENTS.map(({ id }) => [id, matched.filter((v) => inSegment(v, id)).length]),
  ) as Record<VacancySegment, number>;

  const visible = matched
    .filter((vacancy) => inSegment(vacancy, query.segment))
    .sort(
      (a, b) =>
        compare(a, b, query.sort) ||
        // Stable tiebreak, so two rows created in the same second never swap
        // places between renders.
        time(b.createdAt) - time(a.createdAt) ||
        a.id.localeCompare(b.id),
    );

  return {
    visible,
    counts,
    filtersActive: needle !== '' || query.department !== '',
  };
}

/**
 * Departments to filter by: every one the company profile defines, plus any a
 * vacancy was filed under that the profile no longer lists — a filter that
 * cannot reach an existing vacancy would hide it.
 */
export function departmentOptions(
  vacancies: JobVacancyResponse[],
  profileDepartments: string[],
): string[] {
  const names = new Set(profileDepartments.filter(Boolean));
  for (const vacancy of vacancies) {
    if (vacancy.department) {
      names.add(vacancy.department);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/* --- Summary ------------------------------------------------------------- */

export interface VacancySummary {
  live: number;
  drafts: number;
  /** Published, with a deadline between today and seven days from now. */
  closingThisWeek: number;
}

/**
 * The one-line answer to "what is the state of my hiring?", computed from the
 * vacancies themselves and nothing else — no applicant figures, because there
 * are none yet.
 */
export function summarizeVacancies(
  vacancies: JobVacancyResponse[],
  today: string = todayIso(),
): VacancySummary {
  const live = vacancies.filter((v) => v.status === 'PUBLISHED');
  return {
    live: live.length,
    drafts: vacancies.filter((v) => v.status === 'DRAFT').length,
    closingThisWeek: live.filter((v) => {
      if (!v.applicationDeadline) {
        return false;
      }
      const days = daysBetween(today, v.applicationDeadline);
      return days >= 0 && days <= 7;
    }).length,
  };
}

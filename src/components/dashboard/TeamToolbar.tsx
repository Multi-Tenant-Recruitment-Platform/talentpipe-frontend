import type { Segment } from '../../dashboard/teamRoster';
import { formatRole } from '../../utils/format';
import { Button } from '../ui/Button';
import { Icon } from './Icon';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
];

/**
 * Filter bar above the roster: status segment, role, and free-text search.
 *
 * <p>The segment control is a radio group, not ARIA tabs. Tabs describe
 * navigation between separate content regions and would require a tabpanel
 * whose label claims to describe the table — but the table is filtered by
 * three controls at once, so that label would be a lie. Radios say the true
 * thing: pick one of these mutually exclusive values. Using real inputs also
 * gives arrow-key navigation and a single tab stop for free.</p>
 */
export function TeamToolbar({
  segment,
  onSegmentChange,
  segmentCounts,
  roleFilter,
  roleOptions,
  onRoleFilterChange,
  query,
  onQueryChange,
  visibleCount,
  totalCount,
  filtersActive,
  onClearFilters,
  disabled = false,
}: {
  segment: Segment;
  onSegmentChange: (segment: Segment) => void;
  segmentCounts: Record<Segment, number>;
  roleFilter: string;
  roleOptions: string[];
  onRoleFilterChange: (role: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  visibleCount: number;
  totalCount: number;
  filtersActive: boolean;
  onClearFilters: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <fieldset
          className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
          disabled={disabled}
        >
          <legend className="sr-only">Filter by status</legend>
          {SEGMENTS.map(({ id, label }) => (
            <label key={id} className="relative shrink-0">
              <input
                type="radio"
                name="team-segment"
                value={id}
                checked={segment === id}
                onChange={() => onSegmentChange(id)}
                className="peer sr-only"
              />
              <span
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700 peer-checked:bg-white peer-checked:text-indigo-700 peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-slate-900/5 peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-500/25 peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
              >
                {label}
                <span className="rounded-full bg-slate-200/80 px-1.5 text-[11px] font-semibold tabular-nums text-slate-600 peer-checked:bg-indigo-100">
                  {segmentCounts[id]}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div>
            <label htmlFor="team-role-filter" className="sr-only">
              Filter by role
            </label>
            <select
              id="team-role-filter"
              value={roleFilter}
              disabled={disabled}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-auto"
            >
              <option value="ALL">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
          </div>

          <div className="relative sm:w-64">
            <label htmlFor="team-search" className="sr-only">
              Search teammates by name or email
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="team-search"
              type="search"
              value={query}
              disabled={disabled}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search name or email…"
              autoComplete="off"
              aria-describedby="team-result-count"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Icon name="x-mark" className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* The page's primary live region: every filter change announces here,
            which is why the search box needs no announcement of its own. */}
        <p id="team-result-count" role="status" aria-live="polite" className="text-xs text-slate-500">
          Showing {visibleCount} of {totalCount} {totalCount === 1 ? 'person' : 'people'}
        </p>
        {filtersActive && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

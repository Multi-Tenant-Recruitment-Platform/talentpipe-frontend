import { Checkbox, Input } from 'antd';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { JobSummary } from '../../api/types';
import { EMPLOYMENT_TYPES, WORKPLACE_TYPES } from '../../dashboard/jobVacancy';
import { hasSalary, type JobFilters } from '../../jobs/jobFilters';
import { Icon } from '../dashboard/Icon';
import { Button } from '../ui/Button';

/**
 * The search bar inside the board's hero. What and where are typed, then
 * submitted together — Enter or the button — so the list does not jump on
 * every keystroke. Remount it (change its `key`) to clear what was typed.
 */
export function JobSearchBar({
  keyword: appliedKeyword,
  location: appliedLocation,
  onSearch,
}: Readonly<{ keyword: string; location: string; onSearch: (keyword: string, location: string) => void }>) {
  const [keyword, setKeyword] = useState(appliedKeyword);
  const [location, setLocation] = useState(appliedLocation);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(keyword.trim(), location.trim());
  };

  return (
    <form role="search" aria-label="Search jobs" onSubmit={submit} className="tp-jobs-search">
      {/* A <label>, so a click anywhere in the half focuses its input. The input's own aria-label is its name. */}
      <label className="tp-jobs-search-field">
        <span aria-hidden="true" className="tp-jobs-search-label">
          What
        </span>
        <Input
          variant="borderless"
          allowClear
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          prefix={<Icon name="search" size={18} />}
          placeholder="Job title, skill or company"
          aria-label="Job title, skill or company"
          enterKeyHint="search"
        />
      </label>
      <span aria-hidden="true" className="tp-jobs-search-divider" />
      <label className="tp-jobs-search-field">
        <span aria-hidden="true" className="tp-jobs-search-label">
          Where
        </span>
        <Input
          variant="borderless"
          allowClear
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          prefix={<Icon name="map-pin" size={18} />}
          placeholder="City or country"
          aria-label="Location"
          enterKeyHint="search"
        />
      </label>
      <Button type="submit" variant="primary" className="tp-jobs-search-submit">
        Search
      </Button>
    </form>
  );
}

/** One filter: its name, then every choice in the open underneath. */
function FilterGroup({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <fieldset className="tp-jobs-filter-group">
      <legend>{label}</legend>
      <div className="tp-jobs-filter-options">{children}</div>
    </fieldset>
  );
}

/** One choice: a tick box, its name, and how many jobs it would leave. */
function FilterOption({
  label,
  count,
  checked,
  onChange,
}: Readonly<{ label: string; count?: number; checked: boolean; onChange: (checked: boolean) => void }>) {
  const empty = count === 0 && !checked;
  return (
    <Checkbox
      className={empty ? 'tp-jobs-filter-option tp-jobs-filter-option-empty' : 'tp-jobs-filter-option'}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span aria-hidden="true" className="tp-jobs-filter-option-count">
          {count}
        </span>
      )}
    </Checkbox>
  );
}

const toggle = <T,>(list: T[], id: T, on: boolean) => (on ? [...list, id] : list.filter((item) => item !== id));

const countBy = <T,>(jobs: JobSummary[], pick: (job: JobSummary) => T | null | undefined, id: T) =>
  jobs.filter((job) => pick(job) === id).length;

/**
 * The filters beside the results. Every choice is visible and ticked in
 * place — no dropdown to open — so what is narrowing the list can be read at
 * a glance, and each choice says how many jobs it holds.
 */
export function JobFilterBar({
  filters,
  onChange,
  jobs,
  canClear,
  onClear,
}: Readonly<{
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
  /** The jobs to count each choice against. Leave out while the counts would be partial. */
  jobs?: JobSummary[];
  /** Whether anything — a filter here, or the search above — is narrowing the list. */
  canClear: boolean;
  onClear: () => void;
}>) {
  const activeCount = filters.employmentTypes.length + filters.workplaceTypes.length + (filters.salaryOnly ? 1 : 0);

  return (
    <section aria-label="Filter jobs" className="tp-jobs-filters">
      <div className="tp-jobs-filters-head">
        <h2>
          <Icon name="funnel" size={18} />
          Filters
          {activeCount > 0 && (
            <span className="tp-jobs-filter-count" aria-label={`${activeCount} active`}>
              {activeCount}
            </span>
          )}
        </h2>
        {canClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>

      <FilterGroup label="Job type">
        {EMPLOYMENT_TYPES.map(({ id, label }) => (
          <FilterOption
            key={id}
            label={label}
            count={jobs && countBy(jobs, (job) => job.employmentType, id)}
            checked={filters.employmentTypes.includes(id)}
            onChange={(on) => onChange({ ...filters, employmentTypes: toggle(filters.employmentTypes, id, on) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Workplace">
        {WORKPLACE_TYPES.map(({ id, label }) => (
          <FilterOption
            key={id}
            label={label}
            count={jobs && countBy(jobs, (job) => job.workplaceType, id)}
            checked={filters.workplaceTypes.includes(id)}
            onChange={(on) => onChange({ ...filters, workplaceTypes: toggle(filters.workplaceTypes, id, on) })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Salary">
        <FilterOption
          label="Salary shown"
          count={jobs && jobs.filter(hasSalary).length}
          checked={filters.salaryOnly}
          onChange={(salaryOnly) => onChange({ ...filters, salaryOnly })}
        />
      </FilterGroup>
    </section>
  );
}

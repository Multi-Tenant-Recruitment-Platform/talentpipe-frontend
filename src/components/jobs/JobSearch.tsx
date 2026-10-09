import { Checkbox, Input } from 'antd';
import { useState, type FormEvent, type ReactNode } from 'react';
import { EMPLOYMENT_TYPES, WORKPLACE_TYPES } from '../../dashboard/jobVacancy';
import type { JobFilters } from '../../jobs/jobFilters';
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

/** One filter: its name on the left, every choice laid out beside it. */
function FilterGroup({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <fieldset className="tp-jobs-filter-group">
      <legend>{label}</legend>
      <div className="tp-jobs-chips">{children}</div>
    </fieldset>
  );
}

/** A choice that can be switched on and off. A real checkbox, drawn as a chip. */
function Chip({ checked, onChange, children }: Readonly<{ checked: boolean; onChange: (checked: boolean) => void; children: string }>) {
  return (
    <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} className="tp-jobs-chip">
      {children}
    </Checkbox>
  );
}

const toggled = <T,>(list: T[], value: T, on: boolean) => (on ? [...list, value] : list.filter((item) => item !== value));

/**
 * The filters under the hero. Every choice is on the page rather than behind
 * a dropdown, one filter to a row, so what can be narrowed — and what already
 * is — reads at a glance. Unlike the search text, these apply as soon as they
 * change.
 */
export function JobFilterBar({
  filters,
  onChange,
  canClear,
  onClear,
}: Readonly<{
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
  /** Whether anything — a filter here, or the search above — is narrowing the list. */
  canClear: boolean;
  onClear: () => void;
}>) {
  return (
    <section aria-label="Filter jobs" className="tp-jobs-filters">
      <div className="tp-jobs-filters-head">
        <h2>
          <Icon name="funnel" size={18} />
          Filters
        </h2>
        {canClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>

      <FilterGroup label="Job type">
        {EMPLOYMENT_TYPES.map(({ id, label }) => (
          <Chip
            key={id}
            checked={filters.employmentTypes.includes(id)}
            onChange={(on) => onChange({ ...filters, employmentTypes: toggled(filters.employmentTypes, id, on) })}
          >
            {label}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Workplace">
        {WORKPLACE_TYPES.map(({ id, label }) => (
          <Chip
            key={id}
            checked={filters.workplaceTypes.includes(id)}
            onChange={(on) => onChange({ ...filters, workplaceTypes: toggled(filters.workplaceTypes, id, on) })}
          >
            {label}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Salary">
        <Chip checked={filters.salaryOnly} onChange={(salaryOnly) => onChange({ ...filters, salaryOnly })}>
          Salary shown
        </Chip>
      </FilterGroup>
    </section>
  );
}

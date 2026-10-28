import {
  DollarOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  LeftOutlined,
  SearchOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { Checkbox, ConfigProvider, Dropdown, Input, Segmented, Select, Slider, type ThemeConfig } from 'antd';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { EmploymentType, JobSummary, PayPeriod, WorkplaceType } from '../../api/types';
import { EMPLOYMENT_TYPES, PAY_PERIODS, WORKPLACE_TYPES } from '../../dashboard/jobVacancy';
import {
  EXPERIENCE_LEVELS,
  activeFilterCount,
  hasSalary,
  salaryBounds,
  type ExperienceLevel,
  type JobFilters,
} from '../../jobs/jobFilters';
import { slate } from '../../theme/tokens';
import type { IconComponent } from '../ui/icon';
import { Button } from '../ui/Button';
import { popoverShell } from '../ui/classes';

/** Placeholders at slate-500, which clears 4.5:1 on white where antd's default does not. */
const BAR_THEME: ThemeConfig = {
  components: {
    Input: { colorTextPlaceholder: slate[500] },
    Select: { colorTextPlaceholder: slate[500] },
  },
};

const amount = (value: number) => value.toLocaleString('en-US');

/** One word per tab, so four equal tabs fit the panel without truncating. */
const PERIOD_TABS: Record<PayPeriod, string> = { HOURLY: 'Hourly', MONTHLY: 'Monthly', ANNUAL: 'Yearly' };

const payLabel = (period: PayPeriod) => PAY_PERIODS.find((p) => p.id === period)?.label ?? period;

/**
 * One field of the search bar: an icon, then a small bold caption over its
 * control — the label-over-value pattern that lets a single bar carry four
 * questions without any of them needing a placeholder to explain itself.
 * Each field lights up as a whole on hover and focus.
 */
function Field({
  icon: Icon,
  caption,
  children,
  as: Tag = 'div',
  className = '',
}: Readonly<{ icon: IconComponent; caption: string; children: ReactNode; as?: 'div' | 'label'; className?: string }>) {
  return (
    <Tag
      className={`flex min-w-0 cursor-text items-center gap-3 rounded-xl px-4 py-2.5 transition-colors duration-(--tp-motion-fast) hover:bg-slate-100 focus-within:bg-slate-100 lg:rounded-pill ${className}`}
    >
      <Icon aria-hidden className="flex-none text-[18px] text-primary-600" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span aria-hidden="true" className="text-caption font-bold text-slate-900">
          {caption}
        </span>
        {children}
      </span>
    </Tag>
  );
}

/** A hairline between fields: across the bar from `lg`, between the stacked rows below it. */
const Divider = () => (
  <span aria-hidden="true" className="mx-4 h-px flex-none bg-slate-200 lg:mx-0 lg:h-8 lg:w-px" />
);

/**
 * The salary range. Pay can only be compared within one pay period and one
 * currency, so until those hold the slider is shown disabled with the reason.
 */
function SalaryRange({
  jobs,
  filters,
  onChange,
}: Readonly<{ jobs: JobSummary[]; filters: JobFilters; onChange: (next: JobFilters) => void }>) {
  const labelId = useId();
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const bounds = salaryBounds(jobs, filters.payPeriod);

  if (!bounds.available) {
    return (
      <div>
        <p id={labelId} className="m-0 text-small font-semibold text-slate-900">
          Salary range
        </p>
        <Slider range disabled aria-labelledby={labelId} value={[0, 100]} className="my-2" />
        <p className="m-0 text-caption text-slate-500">{bounds.reason}</p>
      </div>
    );
  }

  const value = draft ?? filters.salaryRange ?? [bounds.min, bounds.max];
  const commit = ([low, high]: number[]) => {
    setDraft(null);
    const whole = low <= bounds.min && high >= bounds.max;
    onChange({ ...filters, salaryRange: whole ? null : [low, high] });
  };

  return (
    <div>
      <p className="m-0 flex items-baseline justify-between gap-2 text-small">
        <span id={labelId} className="font-semibold text-slate-900">
          Salary range
        </span>
        <span data-numeric className="truncate font-semibold text-primary-700">
          {bounds.currency} {amount(value[0])} – {amount(value[1])}
        </span>
      </p>
      <Slider
        range
        aria-labelledby={labelId}
        min={bounds.min}
        max={bounds.max}
        value={value}
        onChange={(next) => setDraft(next as [number, number])}
        onChangeComplete={commit}
        tooltip={{ formatter: (v) => (v === undefined ? '' : amount(v)) }}
        className="my-2"
      />
    </div>
  );
}

/**
 * Pay period and salary range together, in a panel under the Salary field —
 * the range only means something once a period is chosen, so they belong in
 * one place. Opening moves focus into the panel; Escape closes it and hands
 * focus back to the field.
 */
function SalaryField({
  jobs,
  filters,
  onChange,
}: Readonly<{ jobs: JobSummary[]; filters: JobFilters; onChange: (next: JobFilters) => void }>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    // After the popup has painted, or the focus lands on nothing.
    const frame = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('input, button')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const summary = filters.payPeriod
    ? `${payLabel(filters.payPeriod)}${
        filters.salaryRange ? ` · ${amount(filters.salaryRange[0])}–${amount(filters.salaryRange[1])}` : ''
      }`
    : 'Any pay';

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottom"
      destroyOnHidden
      popupRender={() => (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-label="Salary"
          onKeyDown={handleKeyDown}
          className={`flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-4 p-4 ${popoverShell}`}
        >
          <div>
            <p className="m-0 mb-2 text-small font-semibold text-slate-900">Pay period</p>
            <Segmented<PayPeriod | 'any'>
              block
              aria-label="Pay period"
              value={filters.payPeriod ?? 'any'}
              options={[{ value: 'any', label: 'Any' }, ...PAY_PERIODS.map(({ id }) => ({ value: id, label: PERIOD_TABS[id] }))]}
              // A range in one period means nothing in another, so it starts again.
              onChange={(period) =>
                onChange({ ...filters, payPeriod: period === 'any' ? null : period, salaryRange: null })
              }
            />
          </div>
          {/* Keyed by period, so a new period drops a half-dragged range. */}
          <SalaryRange key={filters.payPeriod ?? 'any'} jobs={jobs} filters={filters} onChange={onChange} />
        </div>
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Salary: ${summary}`}
        className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-4 py-2.5 text-left transition-colors duration-(--tp-motion-fast) hover:bg-slate-100 focus-visible:bg-slate-100 lg:rounded-pill"
      >
        <DollarOutlined aria-hidden className="flex-none text-[18px] text-primary-600" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-caption font-bold text-slate-900">Salary</span>
          <span className={`truncate text-body ${filters.payPeriod ? 'text-slate-900' : 'text-slate-500'}`}>
            {summary}
          </span>
        </span>
      </button>
    </Dropdown>
  );
}

/**
 * The search bar: one white pill on the hero, the page's single focal point.
 * What and where go to the backend together — Enter or the button — so the
 * list does not jump on every keystroke; experience and salary narrow the
 * loaded jobs at once. Remount it (change its `key`) to clear what was typed.
 */
export function JobSearchBar({
  compact = false,
  keyword: appliedKeyword,
  location: appliedLocation,
  onSearch,
  filters,
  onChange,
  jobs,
}: Readonly<{
  compact?: boolean;
  keyword: string;
  location: string;
  onSearch: (keyword: string, location: string) => void;
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
  /** Every job loaded so far, for the salary range's bounds. */
  jobs: JobSummary[];
}>) {
  const [keyword, setKeyword] = useState(appliedKeyword);
  const [location, setLocation] = useState(appliedLocation);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(keyword.trim(), location.trim());
  };

  if (compact) return (
    <form className="board-search-form" role="search" aria-label="Search jobs" onSubmit={submit}>
      <label className="board-search-field">
        <SearchOutlined aria-hidden />
        <input aria-label="Job title, skill or company" placeholder="Job title, keywords" value={keyword} onChange={event => setKeyword(event.target.value)} />
      </label>
      <label className="board-search-field">
        <EnvironmentOutlined aria-hidden />
        <input aria-label="Location" placeholder="Location" value={location} onChange={event => setLocation(event.target.value)} />
      </label>
      <button type="submit">Search Jobs</button>
    </form>
  );

  return (
    <ConfigProvider theme={BAR_THEME}>
      <form
        role="search"
        aria-label="Search jobs"
        onSubmit={submit}
        className="flex flex-col rounded-2xl bg-surface p-2 shadow-xl ring-1 ring-slate-900/5 lg:flex-row lg:items-center lg:rounded-pill"
      >
        <Field as="label" icon={SearchOutlined} caption="What" className="lg:flex-[1.4]">
          <Input
            variant="borderless"
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Job title, keywords"
            aria-label="Job title, skill or company"
            enterKeyHint="search"
            className="p-0 text-body text-slate-900"
          />
        </Field>
        <Divider />
        <Field as="label" icon={EnvironmentOutlined} caption="Where" className="lg:flex-1">
          <Input
            variant="borderless"
            allowClear
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            aria-label="Location"
            enterKeyHint="search"
            className="p-0 text-body text-slate-900"
          />
        </Field>
        <Divider />
        <Field icon={SolutionOutlined} caption="Experience" className="cursor-pointer lg:flex-1">
          <Select<ExperienceLevel>
            variant="borderless"
            aria-label="Experience"
            value={filters.experience}
            options={EXPERIENCE_LEVELS.map(({ id, label }) => ({ value: id, label }))}
            onChange={(experience) => onChange({ ...filters, experience })}
            popupMatchSelectWidth={false}
            classNames={{ root: 'h-[22px] w-full px-0', content: 'text-slate-900' }}
          />
        </Field>
        <Divider />
        <div className="min-w-0 lg:flex-1">
          <SalaryField jobs={jobs} filters={filters} onChange={onChange} />
        </div>
        <Button
          type="submit"
          variant="primary"
          icon={<SearchOutlined aria-hidden />}
          className="m-1 mt-2 h-12 flex-none rounded-pill px-6 text-lead font-semibold shadow-primary lg:mt-1 lg:h-14 lg:px-7"
        >
          Search
        </Button>
      </form>
    </ConfigProvider>
  );
}

type QuickFilter =
  | { kind: 'workplace'; id: WorkplaceType }
  | { kind: 'type'; id: EmploymentType }
  | { kind: 'salary' };

/** The choices people reach for most, one tap away. Each is the same filter as its tick box in the panel. */
const QUICK_FILTERS: { label: string; filter: QuickFilter }[] = [
  { label: 'Remote', filter: { kind: 'workplace', id: 'REMOTE' } },
  { label: 'Hybrid', filter: { kind: 'workplace', id: 'HYBRID' } },
  { label: 'Full time', filter: { kind: 'type', id: 'FULL_TIME' } },
  { label: 'Part time', filter: { kind: 'type', id: 'PART_TIME' } },
  { label: 'Internship', filter: { kind: 'type', id: 'INTERNSHIP' } },
  { label: 'Salary shown', filter: { kind: 'salary' } },
];

function isOn(filters: JobFilters, filter: QuickFilter) {
  if (filter.kind === 'workplace') return filters.workplaceTypes.includes(filter.id);
  if (filter.kind === 'type') return filters.employmentTypes.includes(filter.id);
  return filters.salaryOnly;
}

function flip(filters: JobFilters, filter: QuickFilter, on: boolean): JobFilters {
  if (filter.kind === 'workplace') return { ...filters, workplaceTypes: toggle(filters.workplaceTypes, filter.id, on) };
  if (filter.kind === 'type') return { ...filters, employmentTypes: toggle(filters.employmentTypes, filter.id, on) };
  return { ...filters, salaryOnly: on };
}

/** One-tap filter chips under the search bar, on the dark hero. Pressed chips turn white. */
export function QuickFilters({
  filters,
  onChange,
  className = '',
}: Readonly<{ filters: JobFilters; onChange: (next: JobFilters) => void; className?: string }>) {
  return (
    <div role="group" aria-label="Quick filters" className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span aria-hidden="true" className="mr-1 text-small font-medium text-slate-300">
        Popular:
      </span>
      {QUICK_FILTERS.map(({ label, filter }) => {
        const on = isOn(filters, filter);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(flip(filters, filter, !on))}
            className={`cursor-pointer rounded-pill border px-3.5 py-1.5 text-small font-medium transition-colors duration-(--tp-motion-fast) focus-visible:outline-white ${
              on
                ? 'border-white bg-white text-primary-700'
                : 'border-slate-600 bg-slate-800/60 text-slate-100 hover:border-slate-400 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
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

const toggle = <T,>(list: T[], id: T, on: boolean) =>
  on ? (list.includes(id) ? list : [...list, id]) : list.filter((item) => item !== id);

const countBy = <T,>(jobs: JobSummary[], pick: (job: JobSummary) => T | null | undefined, id: T) =>
  jobs.filter((job) => pick(job) === id).length;

/**
 * The filters beside the results. Every choice is visible and ticked in
 * place — no dropdown to open — so what is narrowing the list can be read at
 * a glance, and each choice says how many jobs it holds. The chevron folds
 * the groups away; `collapsible` is off inside the phone drawer, which has
 * its own close.
 */
export function JobFilterBar({
  filters,
  onChange,
  jobs,
  canClear,
  onClear,
  collapsible = true,
}: Readonly<{
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
  /** The jobs to count each choice against. Leave out while the counts would be partial. */
  jobs?: JobSummary[];
  /** Whether anything — a filter here, or the search above — is narrowing the list. */
  canClear: boolean;
  onClear: () => void;
  collapsible?: boolean;
}>) {
  const [open, setOpen] = useState(true);
  const groupsId = useId();
  const activeCount = activeFilterCount(filters);

  return (
    <section aria-label="Filter jobs" className="tp-jobs-filters">
      <div className="tp-jobs-filters-head">
        <h2>
          <FilterOutlined aria-hidden className="text-[16px]" />
          Filters
          {activeCount > 0 && (
            <span className="tp-jobs-filter-count" aria-label={`${activeCount} active`}>
              {activeCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          {canClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
          )}
          {collapsible && (
            <button
              type="button"
              aria-label={open ? 'Hide filters' : 'Show filters'}
              aria-expanded={open}
              aria-controls={groupsId}
              onClick={() => setOpen(!open)}
              className="grid size-8 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-slate-600 hover:bg-sunken hover:text-slate-900"
            >
              <LeftOutlined
                aria-hidden
                className={`text-[12px] transition-transform duration-(--tp-motion-base) ${open ? '-rotate-90' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      <div id={groupsId} hidden={!open}>
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
      </div>
    </section>
  );
}

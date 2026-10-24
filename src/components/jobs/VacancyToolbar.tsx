import { SearchOutlined } from '@ant-design/icons';
import { Flex, Input, Radio, Select, Switch, Typography } from 'antd';
import {
  VACANCY_SEGMENTS,
  VACANCY_SORTS,
  type VacancyQuery,
  type VacancySegment,
  type VacancySort,
} from '../../dashboard/vacancyList';
import { Button } from '../ui/Button';

export const VACANCY_SEARCH_ID = 'vacancy-search';

/**
 * Filter bar above the vacancy list: status segment, search, department, sort.
 *
 * <p>The same construction as `TeamToolbar`, for the same reasons: the status
 * segment is a radio group (one value from several, filtering a list that
 * three controls shape at once — not tabs over separate panels), and a single
 * live region announces every change so no control needs its own.</p>
 */
export function VacancyToolbar({
  query,
  onChange,
  counts,
  departments,
  visibleCount,
  totalCount,
  filtersActive,
  onClearFilters,
  onMineChange,
  disabled = false,
}: Readonly<{
  query: VacancyQuery;
  onChange: (next: Partial<VacancyQuery>) => void;
  counts: Record<VacancySegment, number>;
  departments: string[];
  visibleCount: number;
  totalCount: number;
  filtersActive: boolean;
  onClearFilters: () => void;
  /**
   * Offered to someone who sees every vacancy, to narrow to the ones they work
   * on. Left out for everyone else: their list already is exactly that.
   */
  onMineChange?: (mine: boolean) => void;
  disabled?: boolean;
}>) {
  return (
    <Flex vertical gap={12}>
      {/* Scrolls sideways on a phone instead of wrapping the five segments
          into a ragged second row; the padding keeps the focus ring inside
          the scroll box rather than clipped by it. */}
      {/* Five segments do not fit a phone. They scroll rather than wrap, and the
          padding keeps each button's focus ring inside the scroll box. */}
      <div className="tp-segment-scroll -m-1 overflow-x-auto p-1">
        <fieldset className="m-0 border-0 p-0" disabled={disabled}>
          <legend className="sr-only">Filter by status</legend>
          <Radio.Group
            value={query.segment}
            disabled={disabled}
            onChange={(e) => onChange({ segment: e.target.value as VacancySegment })}
            optionType="button"
            buttonStyle="solid"
            options={VACANCY_SEGMENTS.map(({ id, label }) => ({
              value: id,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {label}
                  <span className="tabular-nums opacity-75">
                    {counts[id]}
                  </span>
                </span>
              ),
            }))}
          />
        </fieldset>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px]">
        <div>
          <label htmlFor={VACANCY_SEARCH_ID} className="sr-only">
            Search vacancies by title, department, location or skill
          </label>
          {/* Plain Input, not Input.Search: filtering is live, so a submit
              button would offer to do something that has already happened. */}
          <Input
            id={VACANCY_SEARCH_ID}
            type="search"
            value={query.query}
            disabled={disabled}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Search title, department, location, skill…"
            autoComplete="off"
            aria-describedby="vacancy-result-count"
            allowClear
            prefix={<SearchOutlined aria-hidden className="text-[16px] opacity-45" />}
          />
        </div>

        <div>
          <label htmlFor="vacancy-department-filter" className="sr-only">
            Filter by department
          </label>
          <Select
            id="vacancy-department-filter"
            value={query.department}
            disabled={disabled}
            onChange={(department: string) => onChange({ department })}
            className="w-full min-w-45"
            options={[
              { value: '', label: 'All departments' },
              ...departments.map((name) => ({ value: name, label: name })),
            ]}
          />
        </div>

        <div>
          <label htmlFor="vacancy-sort" className="sr-only">
            Sort vacancies
          </label>
          <Select
            id="vacancy-sort"
            value={query.sort}
            disabled={disabled}
            onChange={(sort: VacancySort) => onChange({ sort })}
            className="w-full min-w-45"
            options={VACANCY_SORTS.map(({ id, label }) => ({ value: id, label }))}
          />
        </div>
      </div>

      <Flex align="center" justify="space-between" gap={12} className="min-h-6">
        <Typography.Text
          id="vacancy-result-count"
          role="status"
          aria-live="polite"
          type="secondary"
          className="text-caption"
        >
          Showing {visibleCount} of {totalCount} {totalCount === 1 ? 'vacancy' : 'vacancies'}
        </Typography.Text>
        <Flex align="center" gap={12}>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
          {onMineChange && (
            <span className="inline-flex items-center gap-2">
              <Switch
                id="vacancy-mine"
                size="small"
                checked={query.mine}
                disabled={disabled}
                onChange={onMineChange}
              />
              <label htmlFor="vacancy-mine" className="cursor-pointer text-small font-medium text-slate-700">
                Only mine
              </label>
            </span>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}

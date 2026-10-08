import { Flex, Input, Radio, Select, Typography } from 'antd';
import {
  VACANCY_SEGMENTS,
  VACANCY_SORTS,
  type VacancyQuery,
  type VacancySegment,
  type VacancySort,
} from '../../dashboard/vacancyList';
import { fontSize } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
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
  disabled?: boolean;
}>) {
  return (
    <Flex vertical gap={12} className="tp-vacancy-toolbar">
      {/* Scrolls sideways on a phone instead of wrapping the five segments
          into a ragged second row; the padding keeps the focus ring inside
          the scroll box rather than clipped by it. */}
      <div className="tp-segment-scroll">
        <fieldset style={{ border: 0, margin: 0, padding: 0 }} disabled={disabled}>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {label}
                  <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>
                    {counts[id]}
                  </span>
                </span>
              ),
            }))}
          />
        </fieldset>
      </div>

      <div className="tp-vacancy-filters">
        <div className="tp-vacancy-filter-search">
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
            prefix={<Icon name="search" size={16} style={{ opacity: 0.45 }} />}
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
            style={{ minWidth: 180, width: '100%' }}
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
            style={{ minWidth: 180, width: '100%' }}
            options={VACANCY_SORTS.map(({ id, label }) => ({ value: id, label }))}
          />
        </div>
      </div>

      <Flex align="center" justify="space-between" gap={12} style={{ minHeight: 24 }}>
        <Typography.Text
          id="vacancy-result-count"
          role="status"
          aria-live="polite"
          type="secondary"
          style={{ fontSize: fontSize.caption }}
        >
          Showing {visibleCount} of {totalCount} {totalCount === 1 ? 'vacancy' : 'vacancies'}
        </Typography.Text>
        {filtersActive && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

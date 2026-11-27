import { SearchOutlined } from '@ant-design/icons';
import { Flex, Input, Radio, Select } from 'antd';
import { useEffect, useState } from 'react';
import type { ApplicantBand, ApplicantSort } from '../../api/applicants';
import type { ApplicantCounts } from '../../api/types';
import { BANDS } from '../../dashboard/applicants';

/** How long typing pauses before the search runs. */
export const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS: { value: ApplicantSort; label: string }[] = [
  { value: 'default', label: 'Best match first' },
  { value: 'score', label: 'Highest score' },
  { value: 'appliedAt', label: 'Newest applications' },
  { value: 'name', label: 'Name' },
];

/**
 * The filter pills, the search and the sort above the applicant list.
 *
 * <p>The pills are a radio group, as on the team roster: antd's
 * `Radio.Group` renders real radio inputs (one tab stop, arrow keys), which
 * `Segmented` does not. Their counts are the vacancy's totals, whatever is
 * searched.</p>
 *
 * <p>The search box keeps its own text and reports it after a pause, so the
 * list is not re-fetched on every keystroke. In blind mode it is switched off
 * and says why: searching names would reach behind the anonymous labels.</p>
 */
export function ApplicantFilters({
  band,
  onBandChange,
  counts,
  query,
  onQueryChange,
  sort,
  onSortChange,
  blindMode,
}: Readonly<{
  band: ApplicantBand;
  onBandChange: (band: ApplicantBand) => void;
  counts: ApplicantCounts;
  query: string;
  onQueryChange: (query: string) => void;
  sort: ApplicantSort;
  onSortChange: (sort: ApplicantSort) => void;
  blindMode: boolean;
}>) {
  const [draft, setDraft] = useState(query);
  // A query set from outside (Back, "Clear filters") replaces what was typed —
  // adjusted while rendering, as React recommends, rather than in an effect.
  const [synced, setSynced] = useState(query);
  if (query !== synced) {
    setSynced(query);
    setDraft(query);
  }

  useEffect(() => {
    if (draft === query) return undefined;
    const timer = window.setTimeout(() => onQueryChange(draft), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, query, onQueryChange]);

  return (
    <Flex wrap align="center" justify="space-between" gap={12}>
      <fieldset className="m-0 shrink-0 border-0 p-0">
        <legend className="sr-only">Filter applicants by review status</legend>
        <Radio.Group
          value={band}
          onChange={(e) => onBandChange(e.target.value as ApplicantBand)}
          optionType="button"
          buttonStyle="solid"
          options={BANDS.map(({ id, label, count }) => ({
            value: id,
            label: (
              <span className="inline-flex items-center gap-1.5">
                {label}
                <span className="tabular-nums opacity-75">{count(counts)}</span>
              </span>
            ),
          }))}
        />
      </fieldset>

      <Flex wrap align="center" gap={12} className="flex-1 justify-end">
        <div>
          <label htmlFor="applicant-sort" className="sr-only">
            Sort applicants
          </label>
          <Select<ApplicantSort>
            id="applicant-sort"
            value={sort}
            onChange={onSortChange}
            options={SORT_OPTIONS}
            className="min-w-44"
          />
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="applicant-search" className="sr-only">
            Search applicants by name or email
          </label>
          <Input
            id="applicant-search"
            type="search"
            allowClear
            value={blindMode ? '' : draft}
            disabled={blindMode}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={100}
            placeholder={blindMode ? 'Search is off in blind mode' : 'Search name or email'}
            prefix={<SearchOutlined aria-hidden className="text-slate-400" />}
            aria-describedby={blindMode ? 'applicant-search-blind' : undefined}
          />
          {blindMode && (
            <span id="applicant-search-blind" className="sr-only">
              Names and emails are hidden on this vacancy, so they cannot be searched.
            </span>
          )}
        </div>
      </Flex>
    </Flex>
  );
}

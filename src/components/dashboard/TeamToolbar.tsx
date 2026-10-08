import { Flex, Input, Radio, Select, Typography } from 'antd';
import type { Segment } from '../../dashboard/teamRoster';
import { formatRole } from '../../utils/format';
import { Button } from '../ui/Button';
import { Icon } from './Icon';
import { fontSize } from '../../theme/tokens';

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
 *
 * <p>antd's `Radio.Group` keeps that — it renders real radio inputs — where
 * `Segmented`, which looks the same, renders none.</p>
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
}: Readonly<{
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
}>) {
  return (
    <Flex vertical gap={12} style={{ marginBottom: 16 }}>
      <Flex wrap align="center" justify="space-between" gap={12}>
        {/* The fieldset/legend pair is kept by hand: antd groups the radios
            visually but gives the group no accessible name of its own. */}
        <fieldset style={{ border: 0, margin: 0, padding: 0, flexShrink: 0 }} disabled={disabled}>
          <legend className="sr-only">Filter by status</legend>
          <Radio.Group
            value={segment}
            disabled={disabled}
            onChange={(e) => onSegmentChange(e.target.value as Segment)}
            optionType="button"
            buttonStyle="solid"
            options={SEGMENTS.map(({ id, label }) => ({
              value: id,
              label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {label}
                  <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>
                    {segmentCounts[id]}
                  </span>
                </span>
              ),
            }))}
          />
        </fieldset>

        <Flex wrap align="center" gap={12} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <div>
            <label htmlFor="team-role-filter" className="sr-only">
              Filter by role
            </label>
            <Select
              id="team-role-filter"
              value={roleFilter}
              disabled={disabled}
              onChange={onRoleFilterChange}
              style={{ minWidth: 160 }}
              options={[
                { value: 'ALL', label: 'All roles' },
                ...roleOptions.map((role) => ({ value: role, label: formatRole(role) })),
              ]}
            />
          </div>

          <div style={{ width: 256, maxWidth: '100%' }}>
            <label htmlFor="team-search" className="sr-only">
              Search teammates by name or email
            </label>
            {/* Plain Input, not Input.Search: that variant appends a submit
                button, and there is nothing to submit — filtering is live. */}
            <Input
              id="team-search"
              type="search"
              value={query}
              disabled={disabled}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search name or email…"
              autoComplete="off"
              aria-describedby="team-result-count"
              allowClear
              prefix={<Icon name="search" size={16} style={{ opacity: 0.45 }} />}
            />
          </div>
        </Flex>
      </Flex>

      <Flex align="center" justify="space-between" gap={12}>
        {/* The page's primary live region: every filter change announces here,
            which is why the search box needs no announcement of its own. */}
        <Typography.Text
          id="team-result-count"
          role="status"
          aria-live="polite"
          type="secondary"
          style={{ fontSize: fontSize.caption }}
        >
          Showing {visibleCount} of {totalCount} {totalCount === 1 ? 'person' : 'people'}
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

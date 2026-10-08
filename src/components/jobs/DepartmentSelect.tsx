import { Divider, Select, Typography } from 'antd';
import { useState } from 'react';
import { fontSize, space } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
import { Button } from '../ui/Button';

/**
 * The department a role reports into, chosen from the ones the company has
 * defined on its profile.
 *
 * <p>With an escape hatch, because the alternative is a dead end. Departments
 * are an admin-defined vocabulary on the company profile, and a workspace that
 * has not filled that in yet would otherwise meet a required field it cannot
 * satisfy without leaving the form and losing everything typed so far. Typing a
 * name offers it as a one-off, which the vacancy stores as plain text — the
 * profile stays the place the canonical list is curated.</p>
 */
export function DepartmentSelect({
  id,
  value,
  departments,
  loading,
  invalid,
  describedBy,
  onChange,
}: Readonly<{
  id: string;
  value: string;
  departments: string[];
  loading: boolean;
  invalid: boolean;
  describedBy?: string;
  onChange: (next: string) => void;
}>) {
  const [query, setQuery] = useState('');

  const known = departments.includes(value);
  // A department typed here on a previous visit is still the vacancy's answer,
  // so it joins the list rather than silently reading as nothing selected.
  const options = (known || value === '' ? departments : [...departments, value]).map((name) => ({
    value: name,
    label: name,
  }));

  const trimmed = query.trim();
  const offerNew =
    trimmed !== '' && !departments.some((name) => name.toLowerCase() === trimmed.toLowerCase());

  return (
    <Select
      id={id}
      value={value === '' ? undefined : value}
      options={options}
      loading={loading}
      showSearch
      allowClear
      status={invalid ? 'error' : undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      placeholder={loading ? 'Loading departments…' : 'Choose a department'}
      style={{ width: '100%' }}
      searchValue={query}
      onSearch={setQuery}
      onChange={(next: string | undefined) => onChange(next ?? '')}
      notFoundContent={
        <Typography.Text type="secondary" style={{ fontSize: fontSize.small }}>
          {departments.length === 0
            ? 'No departments on your company profile yet — type one to use it here.'
            : 'No match. Type a name to use it here.'}
        </Typography.Text>
      }
      popupRender={(menu) => (
        <>
          {menu}
          {offerNew && (
            <>
              <Divider style={{ margin: `${space[1]}px 0` }} />
              <div style={{ padding: `0 ${space[0.5]}px ${space[0.5]}px` }}>
                <Button
                  variant="ghost"
                  size="sm"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => {
                    onChange(trimmed);
                    setQuery('');
                  }}
                >
                  <Icon name="plus" size={14} style={{ marginInlineEnd: space[0.75] }} />
                  Use “{trimmed}”
                </Button>
              </div>
            </>
          )}
        </>
      )}
    />
  );
}

import { CloseOutlined } from '@ant-design/icons';
import { Input, Space, Tag, Typography } from 'antd';
import { useState, type KeyboardEvent } from 'react';
import { cleanValues } from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';

/**
 * A free-text list edited as chips: type one, press Enter, it becomes a tag.
 *
 * <p>Not a comma-separated text box. These lists are rendered item by item, and
 * asking someone to encode a list inside a string means parsing their commas
 * back out — including the ones inside "Honesty, always". Chips keep the
 * boundaries explicit on both sides.</p>
 *
 * <p>Used for company values and for office locations, which are the same
 * interaction over different words.</p>
 *
 * <p>Deliberately not `Select mode="tags"`. The commit rules here are specific:
 * Enter <em>or</em> a comma commits (and suppresses the surrounding form's
 * submit, so adding an entry never saves the whole profile), Backspace on an
 * empty draft removes the last chip, blurring commits what was typed, and
 * `cleanValues` drops blanks and duplicates. A combobox handles none of those
 * the same way.</p>
 */
export function CompanyChipListEditor({
  id,
  label,
  placeholder,
  hint,
  values,
  disabled = false,
  required = false,
  error,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  values: string[];
  disabled?: boolean;
  /** Marks the label, for forms that enforce the list on submit. */
  required?: boolean;
  /** Replaces the hint and is announced — the vacancy form submits all at once. */
  error?: string;
  onChange: (next: string[]) => void;
}>) {
  const [draft, setDraft] = useState('');

  function commit() {
    const next = cleanValues([...values, draft]);
    // cleanValues drops blanks and duplicates, so this is also the guard
    // against adding the same entry twice.
    if (next.length !== values.length) {
      onChange(next);
    }
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter commits rather than submitting the surrounding form — otherwise
    // adding an entry would save the whole profile.
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {label}
        {required && (
          <>
            {' '}
            <span aria-hidden="true" className="font-normal text-slate-400">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>

      {values.length > 0 && (
        <ul className="m-0 mb-2 flex list-none flex-wrap gap-2 p-0">
          {values.map((value) => (
            <li key={value}>
              {/* antd's Tag supplies the chip; the list semantics around it are
                  ours, because the profile renders these as a real list. */}
              <Tag
                color="geekblue"
                closable={!disabled}
                onClose={() => onChange(values.filter((entry) => entry !== value))}
                closeIcon={<CloseOutlined aria-hidden className="text-[12px]" />}
                aria-label={`Remove ${value}`}
                className="me-0 rounded-pill"
              >
                {value}
              </Tag>
            </li>
          ))}
        </ul>
      )}

      <Space.Compact className="w-full">
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          status={error ? 'error' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          // Committing on blur too: typing an entry and clicking Save without
          // pressing Enter should not silently discard it.
          onBlur={commit}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || draft.trim() === ''}
          onClick={commit}
        >
          Add
        </Button>
      </Space.Compact>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        <Typography.Text type="secondary" className="mt-1.5 block text-caption">
          {hint}
        </Typography.Text>
      )}
    </div>
  );
}

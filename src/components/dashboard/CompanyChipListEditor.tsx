import { useState, type KeyboardEvent } from 'react';
import { cleanValues } from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/inputClass';
import { Icon } from './Icon';

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
 */
export function CompanyChipListEditor({
  id,
  label,
  placeholder,
  hint,
  values,
  disabled = false,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  values: string[];
  disabled?: boolean;
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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-3 pr-1.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                {value}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(values.filter((entry) => entry !== value))}
                  aria-label={`Remove ${value}`}
                  className="rounded-full p-0.5 text-indigo-500 transition-colors hover:bg-indigo-100 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="x-mark" className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          // Committing on blur too: typing an entry and clicking Save without
          // pressing Enter should not silently discard it.
          onBlur={commit}
          placeholder={placeholder}
          className={inputClass}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || draft.trim() === ''}
          onClick={commit}
          className="mt-1.5 shrink-0"
        >
          Add
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

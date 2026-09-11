import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../dashboard/Icon';
import { inputClass } from '../ui/inputClass';

/**
 * Password input with a reveal toggle and the reset link. Whether the
 * characters are visible is nobody else's business, so that state lives here
 * rather than in the page.
 */
export function PasswordField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (next: string) => void }>) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <Link
          to="/forgot-password"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus-visible:underline"
        >
          Forgot password?
        </Link>
      </div>
      <div className="relative">
        <input
          id="password"
          type={visible ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10`}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 mt-1.5 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-indigo-600"
        >
          {/* Plain text content (not aria-label) so this button's accessible
              name doesn't collide with getByLabelText(/password/i) queries
              that target the field itself. */}
          <span className="sr-only">{visible ? 'Hide password' : 'Show password'}</span>
          <Icon name={visible ? 'eye-slash' : 'eye'} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

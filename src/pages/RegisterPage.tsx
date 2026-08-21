import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { RegisterTabs } from '../components/RegisterTabs';
import { inputClass } from '../components/ui/inputClass';
import { normalizeSubdomainInput, ROOT_DOMAIN, slugifySubdomain } from '../tenant/subdomain';

/** Company onboarding (PB-001): tenant + first COMPANY_ADMIN, then off to login. */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  // Derived from the company name until the user edits it themselves — most
  // people never touch it, and the ones who care can still override.
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        companyName,
        // Omitted when blank so a backend that generates its own slug is
        // unaffected by this field existing.
        subdomain: subdomain || undefined,
        admin: { firstName, lastName, email, password },
      });
      // Registration issues no tokens: continue at login, with the workspace
      // carried across so the sign-in form is already filled in.
      navigate('/login', {
        state: { registered: 'company', mode: 'company', subdomain, email },
      });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCompanyNameChange(value: string) {
    setCompanyName(value);
    if (!subdomainTouched) {
      setSubdomain(slugifySubdomain(value));
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">
        Choose how you want to use TalentPipe.
      </p>

      <div className="mt-6">
        <RegisterTabs active="company" />
      </div>

      <h2 className="mt-6 text-lg font-semibold tracking-tight">Register your company</h2>
      <p className="mt-1 text-sm text-slate-600">
        Creates your company workspace and its first administrator account.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
            Company name
          </label>
          <input
            id="companyName"
            required
            maxLength={255}
            value={companyName}
            onChange={(e) => handleCompanyNameChange(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* The workspace address the whole team will sign in with. */}
        <div>
          <label htmlFor="subdomain" className="block text-sm font-medium text-slate-700">
            Workspace address
          </label>
          <div className="mt-1 flex rounded-md border border-slate-300 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
            <input
              id="subdomain"
              required
              value={subdomain}
              onChange={(e) => {
                setSubdomainTouched(true);
                setSubdomain(normalizeSubdomainInput(e.target.value));
              }}
              className="min-w-0 flex-1 rounded-l-md border-0 bg-transparent px-3 py-2 text-sm focus:outline-none"
              placeholder="acme"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <span className="shrink-0 rounded-r-md border-l border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              .{ROOT_DOMAIN}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Your team will sign in at{' '}
            <span className="font-medium text-slate-600">
              {subdomain || 'acme'}.{ROOT_DOMAIN}
            </span>.
          </p>
        </div>


        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              id="firstName"
              required
              maxLength={100}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              id="lastName"
              required
              maxLength={100}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? 'Creating workspace…' : 'Create company account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

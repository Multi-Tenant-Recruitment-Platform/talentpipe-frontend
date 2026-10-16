import { Flex, Input } from 'antd';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { AuthHeading } from '../components/auth/AuthHeading';
import { useFormFields } from '../components/auth/useFormFields';

/**
 * Landing page for the link in a password-reset email (PB-008). Sets a new
 * password against the single-use token from the query string.
 *
 * <p>The backend revokes every existing session on success, so the user is
 * sent to the login page rather than being signed in here.</p>
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { values, field } = useFormFields({ password: '', confirmPassword: '' });
  const { password, confirmPassword } = values;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password-reset/confirm', { token, newPassword: password });
      navigate('/login', { state: { passwordReset: true } });
    } catch (err: unknown) {
      setError(
        apiErrorMessage(err, 'We could not reset your password. The link may have expired or already been used.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <AuthHeading title="This link is incomplete">
          The reset token is missing. Please open the link directly from your email.
        </AuthHeading>
        <Link to="/forgot-password" className="mt-6 inline-block font-semibold">
          Request a new reset link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading title="Choose a new password">
        Signing you out everywhere else — any other active session ends when you save this.
      </AuthHeading>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
        <Flex vertical gap={20}>
          {error && <Alert tone="error">{error}</Alert>}

          <AuthField id="password" label="New password" hint="At least 8 characters.">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              {...field('password')}
              autoComplete="new-password"
            />
          </AuthField>

          <AuthField id="confirmPassword" label="Confirm new password">
            <Input
              id="confirmPassword"
              type="password"
              required
              {...field('confirmPassword')}
              autoComplete="new-password"
            />
          </AuthField>

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {submitting ? 'Saving…' : 'Save new password'}
          </Button>

          <Link to="/login" className="block text-center font-medium">
            Back to sign in
          </Link>
        </Flex>
      </form>
    </AuthShell>
  );
}

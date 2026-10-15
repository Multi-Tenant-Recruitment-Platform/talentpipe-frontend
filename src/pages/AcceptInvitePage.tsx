import { Flex, Input } from 'antd';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { AuthHeading } from '../components/auth/AuthHeading';

/**
 * Landing page for the link in an invitation email (PB-003 / PB-004). Setting
 * a password accepts the invitation and activates the account.
 *
 * <p>The tenant and role are fixed by the invitation itself — nothing here can
 * influence which workspace or role the account joins.</p>
 */
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      await api.post('/auth/accept-invite', { token, password });
      navigate('/login', { state: { mode: 'company', inviteAccepted: true } });
    } catch (err: unknown) {
      setError(
        apiErrorMessage(err, 'We could not accept this invitation. It may have expired or already been used.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <AuthHeading title="This link is incomplete">
          The invitation token is missing. Please open the link directly from your invitation email.
        </AuthHeading>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading title="Accept your invitation">
        Choose a password to activate your account and join the workspace.
      </AuthHeading>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
        <Flex vertical gap={20}>
          {error && <Alert tone="error">{error}</Alert>}

          <AuthField id="password" label="Password" hint="At least 8 characters.">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </AuthField>

          <AuthField id="confirmPassword" label="Confirm password">
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </AuthField>

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {submitting ? 'Activating…' : 'Accept invitation'}
          </Button>

          <Link to="/login" className="block text-center font-medium">
            Back to sign in
          </Link>
        </Flex>
      </form>
    </AuthShell>
  );
}

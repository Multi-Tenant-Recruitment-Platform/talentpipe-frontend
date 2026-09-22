import { Flex, Input, Typography } from 'antd';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';

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
        <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>This link is incomplete</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
          The invitation token is missing. Please open the link directly from your invitation email.
        </Typography.Paragraph>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>Accept your invitation</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        Choose a password to activate your account and join the workspace.
      </Typography.Paragraph>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: 24 }}>
        <Flex vertical gap={20}>
        {error && (
          <Alert tone="error">{error}</Alert>
        )}

        <div>
          <label htmlFor="password" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Password
          </label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>At least 8 characters.</Typography.Text>
        </div>

        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" variant="primary" loading={submitting} style={{ width: '100%' }}>
          {submitting ? 'Activating…' : 'Accept invitation'}
        </Button>

        <Link to="/login"
          style={{ display: 'block', textAlign: 'center', fontWeight: 500 }}>
          Back to sign in
        </Link>
        </Flex>
      </form>
    </AuthShell>
  );
}

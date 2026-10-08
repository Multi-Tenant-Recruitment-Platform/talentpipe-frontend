import { Flex, Input, Typography } from 'antd';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { fontSize } from '../theme/tokens';

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
        <Typography.Title level={1} style={{ fontSize: fontSize.heading, margin: 0 }}>This link is incomplete</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
          The reset token is missing. Please open the link directly from your email.
        </Typography.Paragraph>
        <Link
          to="/forgot-password"
          style={{ display: 'inline-block', marginTop: 24, fontWeight: 600 }}
        >
          Request a new reset link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Typography.Title level={1} style={{ fontSize: fontSize.heading, margin: 0 }}>Choose a new password</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        Signing you out everywhere else — any other active session ends when you save this.
      </Typography.Paragraph>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: 24 }}>
        <Flex vertical gap={20}>
        {error && (
          <Alert tone="error">{error}</Alert>
        )}

        <div>
          <label htmlFor="password" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            New password
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
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: fontSize.caption, marginTop: 4 }}>At least 8 characters.</Typography.Text>
        </div>

        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Confirm new password
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
          {submitting ? 'Saving…' : 'Save new password'}
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

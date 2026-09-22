import { Flex, Input, Typography } from 'antd';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

/**
 * Password-reset request. The confirmation is intentionally identical whether
 * or not the email is registered, so the endpoint can't be used to probe for
 * existing accounts.
 *
 * <p>For the same reason the outcome is never reported as a success or a
 * failure — no toast, no error banner. `sent` is set in `finally`, so the same
 * neutral confirmation appears whatever the request did.</p>
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // Best effort — the neutral confirmation below is shown either way.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <AuthShell>
      <Typography.Text className="tp-eyebrow">Account</Typography.Text>
      <Typography.Title level={1} style={{ fontSize: 28, margin: '6px 0 0' }}>
        Reset your password
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        Enter your account email and we&apos;ll send you a reset link.
      </Typography.Paragraph>

      {sent ? (
        <Flex vertical gap={20} style={{ marginTop: 24 }}>
          <Alert tone="success">
            If an account exists for {email}, a password reset link is on its way.
          </Alert>
          <Link to="/login" style={{ textAlign: 'center', fontWeight: 600 }}>
            Back to log in
          </Link>
        </Flex>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: 24 }}>
          <Flex vertical gap={20}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <Button type="submit" variant="primary" loading={submitting} style={{ width: '100%' }}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>

            <Link to="/login" style={{ textAlign: 'center', fontWeight: 500 }}>
              Back to log in
            </Link>
          </Flex>
        </form>
      )}
    </AuthShell>
  );
}

import { MailOutlined } from '@ant-design/icons';
import { Flex, Input } from 'antd';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/auth/AuthField';
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
      {/* Envelope icon — matches wireframe */}
      <div className="mb-6 flex justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <MailOutlined aria-hidden className="text-[26px]" />
        </span>
      </div>

      <h1 className="m-0 text-center text-[1.5rem] font-bold text-slate-900">
        Reset Your Password
      </h1>
      <p className="mb-0 mt-2 text-center text-sm text-slate-500">
        Enter your registered email to receive a secure recovery link.
      </p>

      {sent ? (
        <Flex vertical gap={20} className="mt-6">
          <Alert tone="success">
            A password reset link has been dispatched to your email address.
          </Alert>
          <Link to="/login" className="text-center font-semibold text-sm">
            ← Back to Sign In
          </Link>
        </Flex>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
          <Flex vertical gap={20}>
            <AuthField id="email" label="Email address">
              <Input
                id="email"
                type="email"
                required
                size="large"
                value={email}
                placeholder="candidate@example.com"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </AuthField>

            <Button type="submit" variant="primary" loading={submitting} className="w-full">
              {submitting ? 'Sending…' : 'Send Reset Link'}
            </Button>

            <Link to="/login" className="text-center text-sm font-medium text-primary-600">
              ← Back to Sign In
            </Link>
          </Flex>
        </form>
      )}
    </AuthShell>
  );
}

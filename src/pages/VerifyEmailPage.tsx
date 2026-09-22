import { Typography } from 'antd';
import { Alert } from '../components/ui/Alert';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { Icon } from '../components/dashboard/Icon';

type Status = 'verifying' | 'success' | 'error';

/**
 * Landing page for the link in a verification email (PB-001). Exchanges the
 * token from the query string for account activation, then sends the user on
 * to log in.
 *
 * <p>Works for both identities: the backend resolves whether the token belongs
 * to a company user or a candidate.</p>
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  // React 18 StrictMode mounts effects twice in development; the token is
  // single-use, so the second call would always report "already used".
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) {
      return;
    }
    attempted.current = true;

    if (!token) {
      setStatus('error');
      setMessage('This link is missing its verification token. Please use the link from your email.');
      return;
    }

    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(
          apiErrorMessage(err, 'We could not verify this link. It may have expired or already been used.'),
        );
      });
  }, [token]);

  return (
    <AuthShell>
      {status === 'verifying' && (
        <>
          <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>Verifying your email…</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>This only takes a moment.</Typography.Paragraph>
        </>
      )}

      {status === 'success' && (
        <>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#d1fae5',
              color: '#059669',
            }}
          >
            <Icon name="check" size={24} />
          </span>
          <Typography.Title level={1} style={{ fontSize: 26, marginTop: 16, marginBottom: 0 }}>
            Email verified
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
            Your account is active. You can sign in now.
          </Typography.Paragraph>
          <Link
            to="/login"
            className="tp-cta-link"
            style={{ marginTop: 24 }}
          >
            Continue to sign in
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>We couldn't verify this link</Typography.Title>
          <div style={{ marginTop: 16 }}>
            <Alert tone="error">{message}</Alert>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            Verification links expire after 24 hours and can only be used once. Request a fresh one
            from the sign-in page.
          </Typography.Paragraph>
          <Link
            to="/login"
          style={{ display: 'inline-block', marginTop: 24, fontWeight: 600 }}
          >
            Back to sign in
          </Link>
        </>
      )}
    </AuthShell>
  );
}

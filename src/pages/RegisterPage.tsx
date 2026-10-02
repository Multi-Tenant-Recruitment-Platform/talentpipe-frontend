import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Col, Flex, Input, Row, Typography } from 'antd';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { RegisterTabs } from '../components/RegisterTabs';
import { fontSize } from '../theme/tokens';

/** Company onboarding (PB-001): tenant + first COMPANY_ADMIN, then off to login. */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
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
      // No workspace address is asked for: the backend derives one from the
      // company name, and nobody needs to know it to sign in.
      await register({
        companyName,
        admin: { firstName, lastName, email, password },
      });
      // Registration issues no tokens: continue at login, with the email
      // carried across so the sign-in form is already filled in.
      navigate('/login', {
        state: { registered: 'company', mode: 'company', email },
      });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <Typography.Title level={1} style={{ fontSize: fontSize.heading, margin: 0 }}>Create your account</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        Choose how you want to use TalentPipe.
      </Typography.Paragraph>

      <div style={{ marginTop: 24 }}>
        <RegisterTabs active="company" />
      </div>

      <Typography.Title level={2} style={{ fontSize: fontSize.title, marginTop: 24, marginBottom: 0 }}>Register your company</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
        Creates your company workspace and its first administrator account.
      </Typography.Paragraph>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: 24 }}>
        <Flex vertical gap={20}>
        {error && (
          <Alert tone="error">{error}</Alert>
        )}

        <div>
          <label htmlFor="companyName" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Company name
          </label>
          <Input
            id="companyName"
            required
            maxLength={255}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <label htmlFor="firstName" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
              First name
            </label>
            <Input
              id="firstName"
              required
              maxLength={100}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12}>
            <label htmlFor="lastName" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
              Last name
            </label>
            <Input
              id="lastName"
              required
              maxLength={100}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Col>
        </Row>

        <div>
          <label htmlFor="email" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Work email
          </label>
          <Input
            id="email"
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
            Password
          </label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: fontSize.caption, marginTop: 4 }}>At least 8 characters.</Typography.Text>
        </div>

          <Button type="submit" variant="primary" loading={submitting} style={{ width: '100%' }}>
            {submitting ? 'Creating workspace…' : 'Create company account'}
          </Button>
        </Flex>
      </form>

      <Typography.Paragraph type="secondary" style={{ marginTop: 24, textAlign: 'center' }}>
        Already have an account?{' '}
        <Link to="/login">
          Log in
        </Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}

import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Col, Flex, Input, Row, Typography } from 'antd';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { AuthHeading } from '../components/auth/AuthHeading';
import { useFormFields } from '../components/auth/useFormFields';
import { RegisterTabs } from '../components/RegisterTabs';

/** Company onboarding (PB-001): tenant + first COMPANY_ADMIN, then off to login. */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const { values, field } = useFormFields({ companyName: '', firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { companyName, firstName, lastName, email, password } = values;
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
      <AuthHeading title="Create your account">Choose how you want to use TalentPipe.</AuthHeading>

      <div className="mt-6">
        <RegisterTabs active="company" />
      </div>

      <Typography.Title level={2} className="mt-6 mb-0 text-title">Register your company</Typography.Title>
      <Typography.Paragraph type="secondary" className="m-0 mt-1">
        Creates your company workspace and its first administrator account.
      </Typography.Paragraph>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
        <Flex vertical gap={20}>
          {error && <Alert tone="error">{error}</Alert>}

          <AuthField id="companyName" label="Company name">
            <Input
              id="companyName"
              required
              maxLength={255}
              {...field('companyName')}
            />
          </AuthField>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <AuthField id="firstName" label="First name">
                <Input
                  id="firstName"
                  required
                  maxLength={100}
                  {...field('firstName')}
                />
              </AuthField>
            </Col>
            <Col xs={24} sm={12}>
              <AuthField id="lastName" label="Last name">
                <Input
                  id="lastName"
                  required
                  maxLength={100}
                  {...field('lastName')}
                />
              </AuthField>
            </Col>
          </Row>

          <AuthField id="email" label="Work email">
            <Input
              id="email"
              type="email"
              required
              maxLength={255}
              {...field('email')}
              autoComplete="email"
            />
          </AuthField>

          <AuthField id="password" label="Password" hint="At least 8 characters.">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              {...field('password')}
              autoComplete="new-password"
            />
          </AuthField>

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {submitting ? 'Creating workspace…' : 'Create company account'}
          </Button>
        </Flex>
      </form>

      <Typography.Paragraph type="secondary" className="mt-6 text-center">
        Already have an account? <Link to="/login">Log in</Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}

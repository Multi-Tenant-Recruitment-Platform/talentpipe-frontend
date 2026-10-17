import { Col, Divider, Flex, Input, Row, Typography } from 'antd';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import type { CandidateRegisterRequest } from '../api/types';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/auth/AuthField';
import { useFormFields } from '../components/auth/useFormFields';
import { AuthHeading } from '../components/auth/AuthHeading';
import { RegisterTabs } from '../components/RegisterTabs';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

/**
 * Small divider that labels a group of fields inside the form. `aria-hidden`
 * because the labels beneath already name every field — this is a visual
 * grouping cue, not information of its own.
 */
function SectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Divider titlePlacement="start" className="my-0" aria-hidden="true">
      <Typography.Text className="text-caption font-semibold uppercase tracking-caps" type="secondary">
        {children}
      </Typography.Text>
    </Divider>
  );
}

/**
 * Candidate self-registration (public, no tenant). On success the candidate
 * continues at the login page with the Candidate tab pre-selected.
 */
export function CandidateRegisterPage() {
  const navigate = useNavigate();

  const { values, field } = useFormFields({
    fullName: '',
    identityCardNumber: '',
    address: '',
    contactNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const { confirmPassword, ...fields } = values;
    if (fields.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const request: CandidateRegisterRequest = fields;
      await api.post('/public/candidates/register', request);
      // Registration issues no tokens: continue at the candidate login tab.
      navigate('/login', { state: { registered: 'candidate', email: fields.email } });
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
        <RegisterTabs active="candidate" />
      </div>

      <Typography.Title level={2} className="mt-6 mb-0 text-title">
        Create your candidate account
      </Typography.Title>
      <Typography.Paragraph type="secondary" className="m-0 mt-1">
        One account for every company hiring on TalentPipe — apply once, get discovered again.
      </Typography.Paragraph>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
        <Flex vertical gap={20}>
          {error && <Alert tone="error">{error}</Alert>}

          <SectionLabel>Personal details</SectionLabel>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <AuthField id="fullName" label="Full name">
                <Input
                  id="fullName"
                  required
                  maxLength={200}
                  {...field('fullName')}
                  autoComplete="name"
                />
              </AuthField>
            </Col>
            <Col xs={24} sm={12}>
              <AuthField id="identityCardNumber" label="ID card number">
                <Input
                  id="identityCardNumber"
                  required
                  maxLength={30}
                  {...field('identityCardNumber')}
                  autoComplete="off"
                />
              </AuthField>
            </Col>
          </Row>

          <AuthField id="address" label="Address">
            <Input
              id="address"
              required
              maxLength={500}
              {...field('address')}
              autoComplete="street-address"
            />
          </AuthField>

          <SectionLabel>Contact details</SectionLabel>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <AuthField id="contactNumber" label="Contact number">
                <Input
                  id="contactNumber"
                  type="tel"
                  required
                  maxLength={20}
                  {...field('contactNumber')}
                  autoComplete="tel"
                  placeholder="+94 77 123 4567"
                />
              </AuthField>
            </Col>
            <Col xs={24} sm={12}>
              <AuthField id="email" label="Email">
                <Input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  {...field('email')}
                  autoComplete="email"
                />
              </AuthField>
            </Col>
          </Row>

          <SectionLabel>Account security</SectionLabel>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
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
            </Col>
            <Col xs={24} sm={12}>
              <AuthField id="confirmPassword" label="Confirm password">
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  {...field('confirmPassword')}
                  autoComplete="new-password"
                />
              </AuthField>
            </Col>
          </Row>

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {submitting ? 'Creating account…' : 'Create candidate account'}
          </Button>
        </Flex>
      </form>

      <Typography.Paragraph type="secondary" className="mt-6 text-center">
        Already have an account? <Link to="/login">Log in</Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}

import { Col, Divider, Flex, Input, Row, Typography } from 'antd';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import type { CandidateRegisterRequest } from '../api/types';
import { AuthShell } from '../components/AuthShell';
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
    <Divider titlePlacement="start" style={{ marginBlock: 0 }} aria-hidden="true">
      <Typography.Text className="tp-eyebrow" type="secondary">
        {children}
      </Typography.Text>
    </Divider>
  );
}

/** A labelled field, with optional helper text beneath. */
function Field({
  id,
  label,
  hint,
  children,
}: Readonly<{ id: string; label: string; hint?: string; children: ReactNode }>) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && (
        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
          {hint}
        </Typography.Text>
      )}
    </div>
  );
}

/**
 * Candidate self-registration (public, no tenant). On success the candidate
 * continues at the login page with the Candidate tab pre-selected.
 */
export function CandidateRegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [identityCardNumber, setIdentityCardNumber] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
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
    setSubmitting(true);
    try {
      const request: CandidateRegisterRequest = {
        fullName,
        identityCardNumber,
        address,
        contactNumber,
        email,
        password,
      };
      await api.post('/public/candidates/register', request);
      // Registration issues no tokens: continue at the candidate login tab.
      navigate('/login', { state: { mode: 'candidate', registered: 'candidate', email } });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>
        Create your account
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        Choose how you want to use TalentPipe.
      </Typography.Paragraph>

      <div style={{ marginTop: 24 }}>
        <RegisterTabs active="candidate" />
      </div>

      <Typography.Title level={2} style={{ fontSize: 18, marginTop: 24, marginBottom: 0 }}>
        Create your candidate account
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
        One account for every company hiring on TalentPipe — apply once, get discovered again.
      </Typography.Paragraph>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: 24 }}>
        <Flex vertical gap={20}>
          {error && <Alert tone="error">{error}</Alert>}

          <SectionLabel>Personal details</SectionLabel>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Field id="fullName" label="Full name">
                <Input
                  id="fullName"
                  required
                  maxLength={200}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field id="identityCardNumber" label="ID card number">
                <Input
                  id="identityCardNumber"
                  required
                  maxLength={30}
                  value={identityCardNumber}
                  onChange={(e) => setIdentityCardNumber(e.target.value)}
                  autoComplete="off"
                />
              </Field>
            </Col>
          </Row>

          <Field id="address" label="Address">
            <Input
              id="address"
              required
              maxLength={500}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
            />
          </Field>

          <SectionLabel>Contact details</SectionLabel>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Field id="contactNumber" label="Contact number">
                <Input
                  id="contactNumber"
                  type="tel"
                  required
                  maxLength={20}
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  autoComplete="tel"
                  placeholder="+94 77 123 4567"
                />
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field id="email" label="Email">
                <Input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>
            </Col>
          </Row>

          <SectionLabel>Account security</SectionLabel>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Field id="password" label="Password" hint="At least 8 characters.">
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
              </Field>
            </Col>
            <Col xs={24} sm={12}>
              <Field id="confirmPassword" label="Confirm password">
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </Col>
          </Row>

          <Button type="submit" variant="primary" loading={submitting} style={{ width: '100%' }}>
            {submitting ? 'Creating account…' : 'Create candidate account'}
          </Button>
        </Flex>
      </form>

      <Typography.Paragraph type="secondary" style={{ marginTop: 24, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}

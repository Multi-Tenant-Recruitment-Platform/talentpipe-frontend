import { ArrowRightOutlined } from '@ant-design/icons';
import { Col, Divider, Flex, Input, Row, Typography, type InputRef } from 'antd';
import { useId, useState, type FormEvent, type ReactNode, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client';
import type { CandidateRegisterRequest } from '../../api/types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { RegisterField } from './RegisterField';
import { useFormFields } from './useFormFields';

/**
 * Small divider that labels a group of fields inside the form. `aria-hidden`
 * because the labels beneath already name every field — this is a visual
 * grouping cue, not information of its own.
 */
function SectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Divider titlePlacement="start" className="my-0" aria-hidden="true">
      <Typography.Text className="text-caption font-semibold uppercase tracking-caps text-slate-500">
        {children}
      </Typography.Text>
    </Divider>
  );
}

/**
 * Candidate self-registration (public, no tenant). On success the candidate
 * continues at the login popup, with the "account created" notice.
 */
export function CandidateRegisterForm({
  firstFieldRef,
  onBusyChange,
}: Readonly<{
  /** Lets the popup put focus in the first field when this step appears. */
  firstFieldRef?: Ref<InputRef>;
  /** Reports an in-flight request, so the popup can refuse to close mid-way. */
  onBusyChange?: (busy: boolean) => void;
}>) {
  const navigate = useNavigate();
  // Generated, not fixed: the popup can open over pages with their own fields.
  const uid = useId();
  const id = (name: string) => `${name}${uid}`;

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
    onBusyChange?.(true);
    try {
      const request: CandidateRegisterRequest = fields;
      await api.post('/public/candidates/register', request);
      // Registration issues no tokens: continue at the candidate login tab.
      navigate('/login', { state: { registered: 'candidate', email: fields.email } });
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <Flex vertical gap={20}>
        {error && <Alert tone="error">{error}</Alert>}

        <SectionLabel>Personal details</SectionLabel>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <RegisterField id={id('fullName')} label="Full name">
              <Input
                ref={firstFieldRef}
                id={id('fullName')}
                size="large"
                required
                maxLength={200}
                {...field('fullName')}
                autoComplete="name"
              />
            </RegisterField>
          </Col>
          <Col xs={24} sm={12}>
            <RegisterField id={id('identityCardNumber')} label="ID card number">
              <Input
                id={id('identityCardNumber')}
                size="large"
                required
                maxLength={30}
                {...field('identityCardNumber')}
                autoComplete="off"
              />
            </RegisterField>
          </Col>
        </Row>

        <RegisterField id={id('address')} label="Address">
          <Input
            id={id('address')}
            size="large"
            required
            maxLength={500}
            {...field('address')}
            autoComplete="street-address"
          />
        </RegisterField>

        <SectionLabel>Contact details</SectionLabel>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <RegisterField id={id('contactNumber')} label="Contact number">
              <Input
                id={id('contactNumber')}
                size="large"
                type="tel"
                required
                maxLength={20}
                {...field('contactNumber')}
                autoComplete="tel"
                placeholder="+94 77 123 4567"
              />
            </RegisterField>
          </Col>
          <Col xs={24} sm={12}>
            <RegisterField id={id('email')} label="Email">
              <Input
                id={id('email')}
                size="large"
                type="email"
                required
                maxLength={255}
                {...field('email')}
                autoComplete="email"
              />
            </RegisterField>
          </Col>
        </Row>

        <SectionLabel>Account security</SectionLabel>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <RegisterField id={id('password')} label="Password" hint="At least 8 characters.">
              <Input
                id={id('password')}
                size="large"
                type="password"
                required
                minLength={8}
                maxLength={72}
                {...field('password')}
                autoComplete="new-password"
              />
            </RegisterField>
          </Col>
          <Col xs={24} sm={12}>
            <RegisterField id={id('confirmPassword')} label="Confirm password">
              <Input
                id={id('confirmPassword')}
                size="large"
                type="password"
                required
                minLength={8}
                maxLength={72}
                {...field('confirmPassword')}
                autoComplete="new-password"
              />
            </RegisterField>
          </Col>
        </Row>

        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          className="mt-1 h-12 w-full rounded-pill text-lead shadow-primary"
        >
          {submitting ? 'Creating account…' : 'Create candidate account'}
          {!submitting && <ArrowRightOutlined aria-hidden className="text-[14px]" />}
        </Button>
      </Flex>
    </form>
  );
}

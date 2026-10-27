import { ArrowRightOutlined } from '@ant-design/icons';
import { Col, Divider, Flex, Input, Row, Typography, type InputRef } from 'antd';
import { useId, useState, type FormEvent, type ReactNode, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client';
import { apiErrorStatus, apiFieldErrorMap } from '../../api/errors';
import type { CandidateRegisterRequest } from '../../api/types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { RegisterField } from './RegisterField';
import { fieldErrorProps, knownFieldErrors, useFormFields } from './useFormFields';

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
 *
 * <p>When the server refuses a field — an NIC it cannot read, an email that
 * already has an account — the message goes under that field and the caret
 * to it, instead of a sentence at the top that names a field without pointing
 * at it.</p>
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

  const { values, field, errors, setErrors } = useFormFields({
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

  /** Shows the server's (or our) field errors and puts the caret on the first. */
  function showFieldErrors(found: Partial<Record<keyof typeof values, string>>) {
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(id(first))?.focus();
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const { confirmPassword, ...fields } = values;
    if (fields.password !== confirmPassword) {
      showFieldErrors({ confirmPassword: 'Passwords do not match.' });
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
      const found = knownFieldErrors(values, apiFieldErrorMap(err));
      if (Object.keys(found).length > 0) {
        showFieldErrors(found);
      } else if (apiErrorStatus(err) === 409) {
        showFieldErrors({ email: 'This email already has a candidate account. Sign in instead, or use another email.' });
      } else {
        setError(apiErrorMessage(err, 'Registration failed. Please try again.'));
      }
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
            <RegisterField id={id('fullName')} error={errors.fullName} label="Full name">
              <Input
                ref={firstFieldRef}
                id={id('fullName')}
                size="large"
                required
                maxLength={200}
                {...field('fullName')}
                {...fieldErrorProps(id('fullName'), errors.fullName)}
                autoComplete="name"
              />
            </RegisterField>
          </Col>
          <Col xs={24} sm={12}>
            <RegisterField
              id={id('identityCardNumber')}
              label="NIC number"
              hint="e.g. 200012345678 or 912345678V"
              error={errors.identityCardNumber}
            >
              <Input
                id={id('identityCardNumber')}
                size="large"
                required
                maxLength={20}
                {...field('identityCardNumber')}
                {...fieldErrorProps(id('identityCardNumber'), errors.identityCardNumber)}
                autoComplete="off"
              />
            </RegisterField>
          </Col>
        </Row>

        <RegisterField id={id('address')} error={errors.address} label="Address">
          <Input
            id={id('address')}
            size="large"
            required
            maxLength={500}
            {...field('address')}
            {...fieldErrorProps(id('address'), errors.address)}
            autoComplete="street-address"
          />
        </RegisterField>

        <SectionLabel>Contact details</SectionLabel>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <RegisterField id={id('contactNumber')} error={errors.contactNumber} label="Contact number">
              <Input
                id={id('contactNumber')}
                size="large"
                type="tel"
                required
                maxLength={20}
                {...field('contactNumber')}
                {...fieldErrorProps(id('contactNumber'), errors.contactNumber)}
                autoComplete="tel"
                placeholder="+94 77 123 4567"
              />
            </RegisterField>
          </Col>
          <Col xs={24} sm={12}>
            <RegisterField id={id('email')} error={errors.email} label="Email">
              <Input
                id={id('email')}
                size="large"
                type="email"
                required
                maxLength={255}
                {...field('email')}
                {...fieldErrorProps(id('email'), errors.email)}
                autoComplete="email"
              />
            </RegisterField>
          </Col>
        </Row>

        <SectionLabel>Account security</SectionLabel>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <RegisterField id={id('password')} error={errors.password} label="Password" hint="At least 8 characters.">
              <Input
                id={id('password')}
                size="large"
                type="password"
                required
                minLength={8}
                maxLength={72}
                {...field('password')}
                {...fieldErrorProps(id('password'), errors.password)}
                autoComplete="new-password"
              />
            </RegisterField>
          </Col>
          <Col xs={24} sm={12}>
            <RegisterField id={id('confirmPassword')} error={errors.confirmPassword} label="Confirm password">
              <Input
                id={id('confirmPassword')}
                size="large"
                type="password"
                required
                minLength={8}
                maxLength={72}
                {...field('confirmPassword')}
                {...fieldErrorProps(id('confirmPassword'), errors.confirmPassword)}
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

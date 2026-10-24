import { ArrowRightOutlined } from '@ant-design/icons';
import { Col, Flex, Input, Row, type InputRef } from 'antd';
import { useId, useState, type FormEvent, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../../api/client';
import { apiFieldErrorMap } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { RegisterField } from './RegisterField';
import { fieldErrorProps, knownFieldErrors, useFormFields } from './useFormFields';

/**
 * Company onboarding (PB-001): tenant + first COMPANY_ADMIN, then off to login.
 *
 * <p>The server names a refused field by its path in the request
 * (`admin.email`); those land under the field they mean, with the caret on
 * the first.</p>
 */
export function CompanyRegisterForm({
  firstFieldRef,
  onBusyChange,
}: Readonly<{
  /** Lets the popup put focus in the first field when this step appears. */
  firstFieldRef?: Ref<InputRef>;
  /** Reports an in-flight request, so the popup can refuse to close mid-way. */
  onBusyChange?: (busy: boolean) => void;
}>) {
  const { register } = useAuth();
  const navigate = useNavigate();
  // Generated, not fixed: the popup can open over pages with their own fields.
  const uid = useId();
  const id = (name: string) => `${name}${uid}`;

  const { values, field, errors, setErrors } = useFormFields({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    onBusyChange?.(true);
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
        state: { registered: 'company', email },
      });
    } catch (err: unknown) {
      const found = knownFieldErrors(values, apiFieldErrorMap(err, 'admin.'));
      const first = Object.keys(found)[0];
      if (first) {
        setErrors(found);
        document.getElementById(id(first))?.focus();
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

        <RegisterField id={id('companyName')} error={errors.companyName} label="Company name">
          <Input
            ref={firstFieldRef}
            id={id('companyName')}
            size="large"
            required
            maxLength={255}
            {...field('companyName')}
            {...fieldErrorProps(id('companyName'), errors.companyName)}
          />
        </RegisterField>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <RegisterField id={id('firstName')} error={errors.firstName} label="First name">
              <Input
                id={id('firstName')}
                size="large"
                required
                maxLength={100}
                {...field('firstName')}
                {...fieldErrorProps(id('firstName'), errors.firstName)}
              />
            </RegisterField>
          </Col>
          <Col xs={24} sm={12}>
            <RegisterField id={id('lastName')} error={errors.lastName} label="Last name">
              <Input
                id={id('lastName')}
                size="large"
                required
                maxLength={100}
                {...field('lastName')}
                {...fieldErrorProps(id('lastName'), errors.lastName)}
              />
            </RegisterField>
          </Col>
        </Row>

        <RegisterField id={id('email')} error={errors.email} label="Work email">
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

        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          className="mt-1 h-12 w-full rounded-pill text-lead shadow-primary"
        >
          {submitting ? 'Creating workspace…' : 'Create company account'}
          {!submitting && <ArrowRightOutlined aria-hidden className="text-[14px]" />}
        </Button>
      </Flex>
    </form>
  );
}

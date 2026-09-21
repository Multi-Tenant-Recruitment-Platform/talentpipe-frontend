import { Col, Flex, Input, Modal, Radio, Row, Typography, type InputRef } from 'antd';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { InvitableRole } from '../../api/types';
import { Alert, type AlertTone } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Icon, type IconName } from './Icon';

export interface InviteFormValues {
  firstName: string;
  lastName: string;
  email: string;
  role: InvitableRole;
}

const ROLE_OPTIONS: { id: InvitableRole; label: string; description: string; icon: IconName }[] = [
  {
    id: 'HR_MANAGER',
    label: 'HR Manager',
    description: 'Posts jobs, manages candidates and drives the full pipeline.',
    icon: 'briefcase',
  },
  {
    id: 'INTERVIEWER',
    label: 'Interviewer',
    description: 'Joins interview panels, scores candidates and leaves feedback.',
    icon: 'identification',
  },
];

/**
 * Invitation dialog used by the company admin to bring HR managers and
 * interviewers onto the platform.
 *
 * <p>Failures are rendered <em>inside</em> the dialog. They previously went to
 * a page-level alert that the backdrop covered, and the form cleared itself
 * the instant Send was pressed — so a duplicate-email rejection looked like
 * the form had simply wiped what you typed, with no explanation anywhere.
 * Fields now reset when the dialog opens, not when it submits, so a rejected
 * attempt keeps its values and can be corrected.</p>
 *
 * <p>State is plain `useState` rather than antd's `Form`: the submitted payload
 * is trimmed field by field in `handleSubmit`, and the parent is what decides
 * when the dialog closes — after the roster has refreshed, so the new row is
 * on screen before the dialog disappears.</p>
 */
export function InviteMemberModal({
  open,
  onClose,
  onInvite,
  submitting = false,
  error = null,
  errorTone = 'error',
  focusField = null,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onInvite: (values: InviteFormValues) => void;
  submitting?: boolean;
  error?: string | null;
  errorTone?: AlertTone;
  /** Which field the failure points at, so the fix starts in the right place. */
  focusField?: 'email' | null;
}>) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitableRole>('HR_MANAGER');

  const firstFieldRef = useRef<InputRef>(null);
  const emailRef = useRef<InputRef>(null);

  // Note there is deliberately no reset effect here. The parent unmounts this
  // component when the dialog closes, so the useState initialisers above give
  // every open a clean form. An effect that cleared the fields on `open` would
  // run after the first paint — briefly showing the previous values, and
  // racing anything typed in that window. Crucially, the form is never cleared
  // on submit: a rejected attempt must keep what the admin typed so they can
  // correct one field instead of retyping everything.

  useEffect(() => {
    if (open && focusField === 'email') {
      emailRef.current?.focus();
      emailRef.current?.select();
    }
  }, [open, focusField, error]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onInvite({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      role,
    });
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={560}
      footer={null}
      // Both ignored mid-flight — the invitation may already have been created,
      // and dismissing now would leave the outcome unknown.
      keyboard={!submitting}
      mask={{ closable: !submitting }}
      closable={{ disabled: submitting, 'aria-label': 'Close' }}
      afterOpenChange={(opened) => opened && firstFieldRef.current?.focus()}
      title={
        <Flex align="center" gap={12}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--tp-brand-gradient)',
              color: '#fff',
            }}
          >
            <Icon name="user-plus" size={20} />
          </span>
          <div>
            <Typography.Title level={2} style={{ fontSize: 16, margin: 0 }}>
              Invite team member
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              They&apos;ll get an email with a link to join your workspace. It expires in 7 days.
            </Typography.Text>
          </div>
        </Flex>
      }
    >
      {/* A real form element, so Enter submits from any field. */}
      <form onSubmit={handleSubmit}>
        <Flex vertical gap={20} style={{ paddingTop: 8 }}>
          {error && <Alert tone={errorTone}>{error}</Alert>}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <label htmlFor="invite-first-name">First name</label>
              <Input
                id="invite-first-name"
                ref={firstFieldRef}
                required
                disabled={submitting}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Amaya"
                autoComplete="off"
                style={{ marginTop: 6 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <label htmlFor="invite-last-name">Last name</label>
              <Input
                id="invite-last-name"
                required
                disabled={submitting}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Rathnayake"
                autoComplete="off"
                style={{ marginTop: 6 }}
              />
            </Col>
          </Row>

          <div>
            <label htmlFor="invite-email">Work email</label>
            <Input
              id="invite-email"
              ref={emailRef}
              type="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="off"
              style={{ marginTop: 6 }}
            />
          </div>

          <fieldset disabled={submitting} style={{ border: 0, margin: 0, padding: 0 }}>
            <legend style={{ fontSize: 14, fontWeight: 500 }}>Role</legend>
            <Radio.Group
              value={role}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              disabled={submitting}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Row gutter={[12, 12]}>
                {ROLE_OPTIONS.map((option) => (
                  <Col xs={24} sm={12} key={option.id}>
                    <Radio value={option.id} style={{ display: 'block' }}>
                      <Flex align="center" gap={8}>
                        <Icon name={option.icon} size={16} />
                        <Typography.Text strong>{option.label}</Typography.Text>
                      </Flex>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {option.description}
                      </Typography.Text>
                    </Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </fieldset>

          <Flex align="center" justify="flex-end" gap={12}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              <Icon name="send" size={16} />
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Modal>
  );
}

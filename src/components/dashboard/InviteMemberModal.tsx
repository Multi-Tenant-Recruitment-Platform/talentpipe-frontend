import { IdcardOutlined, SendOutlined, SolutionOutlined, UserAddOutlined } from '@ant-design/icons';
import { Col, Flex, Input, Modal, Radio, Row, Typography, type InputRef } from 'antd';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { InvitableRole } from '../../api/types';
import { Alert, type AlertTone } from '../ui/Alert';
import { Button } from '../ui/Button';
import type { IconComponent } from '../ui/icon';

export interface InviteFormValues {
  firstName: string;
  lastName: string;
  email: string;
  /** The company role chosen, when the workspace's roles are known. */
  roleId?: string;
  /** The fixed role, for a server older than company roles. */
  role?: InvitableRole;
  /** What the chosen role is called, for the confirmation. */
  roleLabel: string;
}

/** One of the workspace's roles, as the invitation offers it. */
export interface InviteRoleOption {
  id: string;
  name: string;
  description: string | null;
  permissionCount: number;
  /** Why it cannot be chosen; absent when it can. */
  unavailable?: string;
  /** The role to start on: the default Recruiter. */
  suggested?: boolean;
}

const ROLE_OPTIONS: { id: InvitableRole; label: string; description: string; icon: IconComponent }[] = [
  {
    id: 'HR_MANAGER',
    label: 'HR Manager',
    description: 'Posts jobs, manages candidates and drives the full pipeline.',
    icon: SolutionOutlined,
  },
  {
    id: 'INTERVIEWER',
    label: 'Interviewer',
    description: 'Joins interview panels, scores candidates and leaves feedback.',
    icon: IdcardOutlined,
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
  roles = [],
  onClose,
  onInvite,
  submitting = false,
  error = null,
  errorTone = 'error',
  focusField = null,
}: Readonly<{
  open: boolean;
  /**
   * The workspace's roles, Owner left out (nobody is invited as Owner). Empty
   * on a server older than company roles, which still takes the two fixed ones.
   */
  roles?: InviteRoleOption[];
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
  const available = roles.filter((option) => !option.unavailable);
  const [roleId, setRoleId] = useState<string | undefined>(
    () => (available.find((option) => option.suggested) ?? available[0])?.id,
  );
  const useCompanyRoles = roles.length > 0;
  const chosen = roles.find((option) => option.id === roleId);

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
    const person = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() };
    if (useCompanyRoles) {
      if (chosen) {
        onInvite({ ...person, roleId: chosen.id, roleLabel: chosen.name });
      }
      return;
    }
    const legacy = ROLE_OPTIONS.find((option) => option.id === role);
    onInvite({ ...person, role, roleLabel: legacy?.label ?? role });
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
          <span className="tp-brand-mark size-10 rounded-md">
            <UserAddOutlined aria-hidden className="text-[20px]" />
          </span>
          <div>
            <Typography.Title level={2} className="m-0 text-lead">
              Invite team member
            </Typography.Title>
            <Typography.Text type="secondary" className="text-caption">
              They&apos;ll get an email with a link to join your workspace. It expires in 7 days.
            </Typography.Text>
          </div>
        </Flex>
      }
    >
      {/* A real form element, so Enter submits from any field. */}
      <form onSubmit={handleSubmit}>
        <Flex vertical gap={20} className="pt-2">
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
                className="mt-1.5"
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
                className="mt-1.5"
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
              className="mt-1.5"
            />
          </div>

          {useCompanyRoles ? (
            <fieldset disabled={submitting} className="m-0 min-w-0 border-0 p-0">
              <legend className="text-body font-medium">Role</legend>
              <Radio.Group
                value={roleId}
                onChange={(e) => setRoleId(e.target.value as string)}
                disabled={submitting}
                className="mt-2 block w-full"
              >
                <ul className="m-0 flex max-h-72 list-none flex-col gap-2 overflow-y-auto p-0 pe-1">
                  {roles.map((option) => (
                    <li key={option.id}>
                      <Radio
                        value={option.id}
                        disabled={Boolean(option.unavailable)}
                        className={`flex w-full items-start rounded-xl border px-3.5 py-3 transition-colors duration-(--tp-motion-base) [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1 ${
                          roleId === option.id ? 'border-primary-200 bg-primary-50' : 'border-slate-200'
                        }`}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <Typography.Text strong>{option.name}</Typography.Text>
                          <span className="shrink-0 text-caption text-slate-500">
                            {option.unavailable ??
                              (option.permissionCount === 1 ? '1 permission' : `${option.permissionCount} permissions`)}
                          </span>
                        </span>
                        {option.description && (
                          <Typography.Text type="secondary" className="block text-caption">
                            {option.description}
                          </Typography.Text>
                        )}
                      </Radio>
                    </li>
                  ))}
                </ul>
              </Radio.Group>
              <Typography.Text type="secondary" className="mt-2 block text-caption">
                Owners can&apos;t be invited directly — invite them with another role, then make them an Owner once
                they&apos;ve joined.
              </Typography.Text>
            </fieldset>
          ) : (
          <fieldset disabled={submitting} className="m-0 border-0 p-0">
            <legend className="text-body font-medium">Role</legend>
            <Radio.Group
              value={role}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              disabled={submitting}
              className="mt-2 w-full"
            >
              <Row gutter={[12, 12]}>
                {ROLE_OPTIONS.map((option) => (
                  <Col xs={24} sm={12} key={option.id}>
                    <Radio value={option.id} className="block">
                      <Flex align="center" gap={8}>
                        <option.icon aria-hidden className="text-[16px]" />
                        <Typography.Text strong>{option.label}</Typography.Text>
                      </Flex>
                      <Typography.Text type="secondary" className="text-caption">
                        {option.description}
                      </Typography.Text>
                    </Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </fieldset>
          )}

          <Flex align="center" justify="flex-end" gap={12}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || (useCompanyRoles && !chosen)}
              icon={<SendOutlined aria-hidden className="text-[16px]" />}
            >
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Modal>
  );
}

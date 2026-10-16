import { BankOutlined, UserOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import type { ReactNode } from 'react';

export type LoginMode = 'candidate' | 'company';

const MODES: { id: LoginMode; label: string; icon: ReactNode }[] = [
  {
    id: 'candidate',
    label: 'Candidate',
    icon: <UserOutlined aria-hidden className="text-[16px]" />,
  },
  {
    id: 'company',
    label: 'Company',
    icon: <BankOutlined aria-hidden className="text-[16px]" />,
  },
];

/**
 * Persona switch on the login page: candidate vs. company. The two personas
 * authenticate differently (only a company login carries a tenant), so the
 * choice drives the form rather than merely labelling it.
 *
 * <p>antd's `Tabs`, not `Segmented`: these are genuinely tabs — each selects a
 * different form beneath — and only `Tabs` emits `role="tab"`. `Segmented`
 * renders radios, which would say the wrong thing about what the control does.
 * The icons stay `aria-hidden`, so each tab's accessible name is exactly its
 * word.</p>
 */
export function LoginModeTabs({
  mode,
  onSelect,
}: Readonly<{ mode: LoginMode; onSelect: (next: LoginMode) => void }>) {
  return (
    <Tabs
      activeKey={mode}
      onChange={(key) => onSelect(key as LoginMode)}
      centered
      aria-label="Login type"
      className="mt-6"
      items={MODES.map(({ id, label, icon }) => ({
        key: id,
        label: (
          <span className="inline-flex items-center gap-2">
            {icon}
            {label}
          </span>
        ),
      }))}
    />
  );
}

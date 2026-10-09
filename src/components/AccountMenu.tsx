import { Dropdown } from 'antd';
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { UserResponse } from '../api/types';
import { can, type Permission } from '../auth/permissions';
import { formatRole } from '../utils/format';
import { Avatar } from './dashboard/Avatar';
import { Icon, type IconName } from './dashboard/Icon';

/**
 * The signed-in person's menu in the public header: avatar, name and role as
 * one trigger, opening a panel of the pages that belong to them.
 *
 * <p>The same trigger and popover as the dashboard's account block, so the
 * two headers read as one product. It differs in two deliberate ways: Log out
 * is not in here — it sits beside the trigger as its own control — and the
 * panel is a list of links, not antd's `Menu`, because these items navigate,
 * and a link is what a screen reader should announce for that.</p>
 *
 * <p>Keyboard: opening moves focus into the panel, the arrow keys step through
 * the items, Escape closes and hands focus back to the trigger, and tabbing
 * out of the panel closes it.</p>
 */

interface AccountItem {
  key: string;
  label: string;
  icon: IconName;
  permission: Permission;
  /** Absent while the page is not built yet: listed, but not a link. */
  to?: string;
}

const ITEMS: AccountItem[] = [
  { key: 'profile', label: 'My profile', icon: 'user', permission: 'profile.manageOwn', to: '/profile' },
  { key: 'applications', label: 'Applied jobs', icon: 'briefcase', permission: 'applications.viewOwn' },
  { key: 'settings', label: 'Settings', icon: 'cog', permission: 'profile.manageOwn' },
  // Company users reach their workspace from here too, so the menu is never empty.
  { key: 'dashboard', label: 'Dashboard', icon: 'squares-2x2', permission: 'dashboard.view', to: '/dashboard' },
];

const PANEL_ID = 'account-menu-panel';

function fullNameOf(user: Pick<UserResponse, 'firstName' | 'lastName' | 'email'>): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

function AccountPanel({
  user,
  triggerRef,
  onClose,
}: Readonly<{
  user: UserResponse;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** `restoreFocus` sends focus back to the trigger, for Escape. */
  onClose: (restoreFocus: boolean) => void;
}>) {
  const { pathname } = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const items = ITEMS.filter((item) => can(user.role, item.permission));

  const links = () => Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []);

  useEffect(() => {
    // After the popup has painted, or the focus lands on nothing.
    const frame = requestAnimationFrame(() => links()[0]?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose(true);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    all[(at + step + all.length) % all.length]?.focus();
  }

  function handleBlur(event: FocusEvent) {
    // Only a Tab that takes focus somewhere else closes the panel here. No
    // relatedTarget means a click, which antd's outside-click already handles;
    // the trigger toggles the panel itself, so closing first would reopen it.
    const next = event.relatedTarget as Node | null;
    if (next && !panelRef.current?.contains(next) && next !== triggerRef.current) {
      onClose(false);
    }
  }

  return (
    <div
      id={PANEL_ID}
      ref={panelRef}
      className="tp-popover tp-account-panel"
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <div className="tp-account-head">
        <Avatar firstName={user.firstName || user.email} lastName={user.lastName} size="md" />
        <div style={{ minWidth: 0 }}>
          <p className="tp-account-name">{fullNameOf(user)}</p>
          <p className="tp-account-email">{user.email}</p>
        </div>
      </div>

      <nav aria-label="Account">
        <ul className="tp-account-list">
          {items.map((item) => {
            const content = (
              <>
                <span className="tp-account-item-icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span className="tp-account-item-label">{item.label}</span>
              </>
            );
            if (!item.to) {
              return (
                <li key={item.key}>
                  {/* Not a link and not focusable: there is nowhere to go yet.
                      Listed anyway, so the menu shows what is coming. */}
                  <span className="tp-account-item" aria-disabled="true">
                    {content}
                    <span className="tp-soon-tag">Soon</span>
                  </span>
                </li>
              );
            }
            const current = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className="tp-account-item"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => onClose(false)}
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function AccountMenu({ user }: Readonly<{ user: UserResponse }>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const name = fullNameOf(user);

  function close(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottomRight"
      // Rendered fresh each time it opens, so focus is placed on every open.
      destroyOnHidden
      popupRender={() => <AccountPanel user={user} triggerRef={triggerRef} onClose={close} />}
    >
      <button
        ref={triggerRef}
        type="button"
        className="tp-profile-trigger"
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
      >
        <Avatar firstName={user.firstName || user.email} lastName={user.lastName} size="sm" />
        <span className="tp-profile-meta">
          <span className="tp-profile-name">{name}</span>
          <span className="tp-profile-role">{formatRole(user.role)}</span>
        </span>
        <Icon name="chevron-down" size={16} className="tp-profile-chevron" />
      </button>
    </Dropdown>
  );
}

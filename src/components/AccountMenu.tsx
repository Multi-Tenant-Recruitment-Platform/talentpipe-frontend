import { AppstoreOutlined, LogoutOutlined, SettingOutlined, SolutionOutlined, UserOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { UserResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { can, roleLabelFor, type Permission } from '../auth/permissions';
import { Avatar } from './dashboard/Avatar';
import { RoleBadge } from './dashboard/RoleBadge';
import { ProfileTrigger } from './ProfileTrigger';
import { popoverShell } from './ui/classes';
import type { IconComponent } from './ui/icon';

/**
 * The signed-in person's menu in the public header: avatar, name and role as
 * one trigger, opening a panel of the pages that belong to them.
 *
 * <p>The same trigger and popover as the dashboard's account block, so the
 * two headers read as one product: name, email and role, the person's pages,
 * then Log out last, set apart and red because it ends the session. The pages
 * are a list of links, not antd's `Menu`, because they navigate and a link is
 * what a screen reader should announce for that; Log out is an action, so it
 * is a button.</p>
 *
 * <p>Keyboard: opening moves focus into the panel, the arrow keys step through
 * the items (Log out included), Escape closes and hands focus back to the
 * trigger, and tabbing out of the panel closes it.</p>
 */

interface AccountItem {
  key: string;
  label: string;
  icon: IconComponent;
  permission: Permission;
  /** Absent while the page is not built yet: listed, but not a link. */
  to?: string;
}

const ITEMS: AccountItem[] = [
  { key: 'profile', label: 'My profile', icon: UserOutlined, permission: 'profile.manageOwn', to: '/profile' },
  { key: 'applications', label: 'Applied jobs', icon: SolutionOutlined, permission: 'applications.viewOwn' },
  { key: 'settings', label: 'Settings', icon: SettingOutlined, permission: 'profile.manageOwn' },
  // Company users reach their workspace from here too, so the menu is never empty.
  { key: 'dashboard', label: 'Dashboard', icon: AppstoreOutlined, permission: 'dashboard.view', to: '/dashboard' },
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
  const { logout } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const items = ITEMS.filter((item) => can(user, item.permission));

  // Everything the arrow keys step through: the page links, then Log out.
  const links = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []);

  async function handleLogout() {
    onClose(false);
    await logout();
    navigate('/', { replace: true });
  }

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
    const at = all.indexOf(document.activeElement as HTMLElement);
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
    // The dashboard's popover shell (.tp-popover), holding links rather than
    // antd Menu items: each entry navigates, so each is announced as a link.
    <div
      id={PANEL_ID}
      ref={panelRef}
      className={`w-70 ${popoverShell}`}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
        <Avatar firstName={user.firstName || user.email} lastName={user.lastName} size="md" />
        <div className="min-w-0">
          <p className="m-0 truncate font-semibold text-slate-900">{fullNameOf(user)}</p>
          <p className="m-0 truncate text-caption text-slate-500">{user.email}</p>
          <div className="mt-1.5">
            <RoleBadge role={user.role} roleName={user.roleName} />
          </div>
        </div>
      </div>

      <nav aria-label="Account">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-1.5">
          {items.map((item) => {
            const content = (
              <>
                <span className="tp-account-item-icon">
                  <item.icon aria-hidden className="text-[18px]" />
                </span>
                <span className="min-w-0 flex-1">{item.label}</span>
              </>
            );
            if (!item.to) {
              return (
                <li key={item.key}>
                  {/* Not a link and not focusable: there is nowhere to go yet.
                      Listed anyway, so the menu shows what is coming. */}
                  <span className="tp-account-item" aria-disabled="true">
                    {content}
                    <span className="shrink-0 rounded-pill bg-sunken px-2 py-px text-[11px] font-semibold tracking-[0.02em] text-slate-600">
                      Soon
                    </span>
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

      {/* Ending the session is destructive enough to be labelled and to turn
          red under the cursor, set apart below the pages — as in the
          dashboard's account menu. */}
      <div className="border-t border-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="tp-account-item w-full cursor-pointer border-0 bg-transparent text-left text-error-text hover:bg-error-bg focus-visible:bg-error-bg focus-visible:outline-offset-[-2px]"
        >
          <span className="tp-account-item-icon text-error-text">
            <LogoutOutlined aria-hidden className="text-[18px]" />
          </span>
          <span className="min-w-0 flex-1">Log out</span>
        </button>
      </div>
    </div>
  );
}

export function AccountMenu({ user, tone = 'light' }: Readonly<{ user: UserResponse; tone?: 'light' | 'dark' }>) {
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
      <ProfileTrigger
        ref={triggerRef}
        firstName={user.firstName || user.email}
        lastName={user.lastName}
        name={name}
        role={roleLabelFor(user)}
        tone={tone}
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
      />
    </Dropdown>
  );
}

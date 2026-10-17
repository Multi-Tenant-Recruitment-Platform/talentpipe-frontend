import { DownOutlined } from '@ant-design/icons';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Avatar } from './dashboard/Avatar';

type ProfileTriggerProps = {
  firstName: string;
  lastName?: string;
  name: string;
  role: string;
  /** `dark` for the public header's slate-900 bar. */
  tone?: 'light' | 'dark';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;

const TONES = {
  light: {
    button: 'hover:border-slate-200 hover:bg-canvas',
    avatar: '',
    text: 'sm:block',
    name: 'text-slate-900',
    role: 'text-slate-500',
    caret: 'text-slate-400 group-hover:text-slate-600',
  },
  // On the dark bar the avatar takes a ring so it does not sink into the
  // slate, and the name waits for `md`, where the bar has room for it.
  // slate-400 on slate-900 is 6.9:1, so the role stays legible at its size.
  dark: {
    button: 'hover:border-slate-700 hover:bg-slate-800',
    avatar: 'rounded-full ring-2 ring-slate-600',
    text: 'md:block',
    name: 'text-white',
    role: 'text-slate-400',
    caret: 'text-slate-400 group-hover:text-slate-200',
  },
} as const;

/**
 * The account trigger shared by the dashboard top bar and the public header,
 * so the two headers read as one product.
 */
// One control made of four elements, so it is one button with one hit target
// and one focus ring — not an avatar sitting next to some text.
export const ProfileTrigger = forwardRef<HTMLButtonElement, ProfileTriggerProps>(function ProfileTrigger(
  { firstName, lastName, name, role, tone = 'light', className = '', ...rest },
  ref,
) {
  const look = TONES[tone];
  return (
    <button
      ref={ref}
      type="button"
      className={`tp-profile-trigger group flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-transparent px-2 py-0 text-inherit transition-[background,border-color] duration-(--tp-motion-base) ease-standard ${look.button} focus-visible:border-primary-600 focus-visible:shadow-focus focus-visible:outline-none ${className}`}
      {...rest}
    >
      <span className={`flex ${look.avatar}`}>
        <Avatar firstName={firstName} lastName={lastName} size="sm" />
      </span>
      <span className={`hidden min-w-0 text-left leading-[1.25] ${look.text}`}>
        <span className={`block max-w-37.5 truncate text-[13.5px] font-semibold ${look.name}`}>{name}</span>
        <span className={`block text-[11.5px] font-medium ${look.role}`}>{role}</span>
      </span>
      <DownOutlined
        aria-hidden
        className={`text-[16px] transition-[color] duration-(--tp-motion-base) ease-standard ${look.caret}`}
      />
    </button>
  );
});

import { DownOutlined } from '@ant-design/icons';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Avatar } from './dashboard/Avatar';

type ProfileTriggerProps = {
  firstName: string;
  lastName?: string;
  name: string;
  role: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;

/**
 * The account trigger shared by the dashboard top bar and the public header,
 * so the two headers read as one product.
 */
// One control made of four elements, so it is one button with one hit target
// and one focus ring — not an avatar sitting next to some text.
export const ProfileTrigger = forwardRef<HTMLButtonElement, ProfileTriggerProps>(function ProfileTrigger(
  { firstName, lastName, name, role, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`tp-profile-trigger group flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-transparent bg-transparent px-2 py-0 text-inherit transition-[background,border-color] duration-(--tp-motion-base) ease-standard hover:border-slate-200 hover:bg-canvas focus-visible:border-primary-600 focus-visible:shadow-focus focus-visible:outline-none ${className}`}
      {...rest}
    >
      <Avatar firstName={firstName} lastName={lastName} size="sm" />
      <span className="hidden min-w-0 text-left leading-[1.25] sm:block">
        <span className="block max-w-37.5 truncate text-[13.5px] font-semibold text-slate-900">{name}</span>
        <span className="block text-[11.5px] font-medium text-slate-500">{role}</span>
      </span>
      <DownOutlined
        aria-hidden
        className="text-[16px] text-slate-400 transition-[color] duration-(--tp-motion-base) ease-standard group-hover:text-slate-600"
      />
    </button>
  );
});

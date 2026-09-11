import type { ReactNode } from 'react';

export type LoginMode = 'candidate' | 'company';

const iconProps = {
  className: 'h-4 w-4',
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.5,
  stroke: 'currentColor',
} as const;

const MODES: { id: LoginMode; label: string; icon: ReactNode }[] = [
  {
    id: 'candidate',
    label: 'Candidate',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
  },
  {
    id: 'company',
    label: 'Company',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
        />
      </svg>
    ),
  },
];

const TAB_BASE =
  'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';
const TAB_ON = 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5';
const TAB_OFF = 'text-slate-500 hover:text-slate-700';

/**
 * Persona switch on the login page: candidate vs. company. The two personas
 * authenticate differently (only a company login carries a tenant), so the
 * choice drives the form rather than merely labelling it.
 */
export function LoginModeTabs({
  mode,
  onSelect,
}: Readonly<{ mode: LoginMode; onSelect: (next: LoginMode) => void }>) {
  return (
    <div
      role="tablist"
      aria-label="Login type"
      className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
    >
      {MODES.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          onClick={() => onSelect(id)}
          className={`${TAB_BASE} ${mode === id ? TAB_ON : TAB_OFF}`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

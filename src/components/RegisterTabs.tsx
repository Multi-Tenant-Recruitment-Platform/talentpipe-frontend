import { Link } from 'react-router-dom';

/**
 * Persona switch shared by the two registration pages, mirroring the tab
 * pattern on the login page. Makes both sign-up paths reachable from either
 * page — a job seeker who lands on the company form (e.g. via "Get started")
 * can flip straight to candidate sign-up.
 */
/**
 * Kept as real `<Link>`s inside a segmented shell rather than an antd `Tabs`.
 * These navigate to separate routes; `Tabs` would swallow the `href`, costing
 * middle-click, "open in new tab" and the browser's own history.
 */
export function RegisterTabs({ active }: Readonly<{ active: 'company' | 'candidate' }>) {
  const tab = (to: string, label: string, selected: boolean) => (
    <Link
      to={to}
      role="tab"
      aria-selected={selected}
      className={`flex items-center justify-center gap-2 rounded-sm px-3 py-2 font-semibold no-underline transition-[background,color] duration-(--tp-motion-base) ease-standard ${
        selected
          ? 'bg-surface text-primary-700 shadow-[0_1px_2px_rgb(15_23_42/8%)] hover:text-primary-700'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </Link>
  );

  return (
    // --- Segmented links ---
    // A segmented control whose items are real links (they navigate). antd's
    // Segmented and Tabs both render non-navigating controls.
    <div role="tablist" aria-label="Account type" className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
      {tab('/register-candidate', 'Job seeker', active === 'candidate')}
      {tab('/register', 'Company', active === 'company')}
    </div>
  );
}

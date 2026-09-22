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
      className={selected ? 'tp-segment tp-segment-on' : 'tp-segment'}
    >
      {label}
    </Link>
  );

  return (
    <div role="tablist" aria-label="Account type" className="tp-segment-group">
      {tab('/register-candidate', 'Job seeker', active === 'candidate')}
      {tab('/register', 'Company', active === 'company')}
    </div>
  );
}

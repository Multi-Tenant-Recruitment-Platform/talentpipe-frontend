import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { can } from '../../auth/permissions';

/** One message per audience, each pointing at a page that exists. */
function promoFor(role: string | null | undefined) {
  if (!role) return { title: 'Get your next role with TalentPipe', cta: 'Create account', to: '/register-candidate' };
  if (can(role, 'dashboard.view')) return { title: 'Hiring? Publish a vacancy', cta: 'Go to dashboard', to: '/dashboard' };
  return { title: 'Make your profile stand out', cta: 'Edit profile', to: '/profile' };
}

/** Concentric arcs, drawn in the card's own slate. Decoration only. */
function ArcPattern() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      preserveAspectRatio="xMaxYMin slice"
      className="pointer-events-none absolute inset-0 size-full text-slate-700"
    >
      {[40, 70, 100, 130, 160].map((r) => (
        <circle key={r} cx="240" cy="0" r={r} />
      ))}
      {[30, 55, 80].map((r) => (
        <circle key={r} cx="0" cy="200" r={r} />
      ))}
      <path d="M120 0v200M0 100h240" />
    </svg>
  );
}

/** The dark card above the filters: one door, chosen for whoever is looking. */
export function JobPromoCard({ className = '' }: Readonly<{ className?: string }>) {
  const { user } = useAuth();
  const { pathname, search, hash } = useLocation();
  const promo = promoFor(user?.role);
  // Signed out, the door is sign-up: open the job seeker form in place rather
  // than leaving the board — whoever is reading this is looking for work.
  const linkProps = user
    ? { to: promo.to }
    : { to: { pathname, search, hash }, replace: true, state: { register: { step: 'candidate' } } };

  return (
    <section
      aria-label="TalentPipe"
      className={`relative isolate flex min-h-48 flex-col justify-end gap-5 overflow-hidden rounded-2xl bg-slate-900 p-6 ${className}`}
    >
      <ArcPattern />
      <h2 className="relative m-0 max-w-56 text-section leading-tight font-bold tracking-heading text-white">
        {promo.title}
      </h2>
      <Link
        {...linkProps}
        className="relative rounded-pill bg-primary-100 px-4 py-2 text-center text-small font-semibold text-primary-700 no-underline transition-colors duration-(--tp-motion-base) hover:bg-primary-200 hover:text-primary-900"
      >
        {promo.cta}
      </Link>
    </section>
  );
}

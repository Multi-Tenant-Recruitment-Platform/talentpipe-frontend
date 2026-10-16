import type { ReactNode } from 'react';
import { AuthBrandPanel } from './AuthBrandPanel';

/**
 * Split-screen layout shared by the auth pages: brand panel on the left,
 * the page's form on the right (the form stands alone on small screens).
 */
export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="relative">
      {/* Soft ambient glow behind the card — decorative only. */}
      <div aria-hidden="true" className="tp-auth-glow" />

      {/* --- Auth shell ---
          The split-screen card behind every sign-in / sign-up page. antd has no
          layout for this; Row/Col would need the brand panel to know its own width. */}
      <section className="mx-auto max-w-140 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-[0_20px_40px_-20px_rgb(15_23_42/15%)] lg:grid lg:max-w-300 lg:grid-cols-2">
        <AuthBrandPanel />
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:py-14">
          <div className="mx-auto w-full max-w-110">{children}</div>
        </div>
      </section>
    </div>
  );
}

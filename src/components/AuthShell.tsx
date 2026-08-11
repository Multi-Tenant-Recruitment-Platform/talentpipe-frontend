import type { ReactNode } from 'react';
import { AuthBrandPanel } from './AuthBrandPanel';

/**
 * Split-screen layout shared by the auth pages: brand panel on the left,
 * the page's form on the right (the form stands alone on small screens).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* Soft ambient glow behind the card — decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 flex justify-center blur-3xl"
      >
        <div className="aspect-[3/1] w-full max-w-4xl bg-gradient-to-tr from-indigo-200 via-violet-100 to-sky-100 opacity-60" />
      </div>

      <section className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 lg:grid lg:grid-cols-2">
        <AuthBrandPanel />
        <div className="px-6 py-10 sm:px-10 sm:py-12 lg:py-14">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </section>
    </div>
  );
}

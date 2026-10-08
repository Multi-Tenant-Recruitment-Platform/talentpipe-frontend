import type { ReactNode } from 'react';
import { AuthBrandPanel } from './AuthBrandPanel';

/**
 * Split-screen layout shared by the auth pages: brand panel on the left,
 * the page's form on the right (the form stands alone on small screens).
 */
export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Soft ambient glow behind the card — decorative only. */}
      <div aria-hidden="true" className="tp-auth-glow" />

      <section className="tp-auth-card">
        <AuthBrandPanel />
        <div className="tp-auth-form">
          <div style={{ width: '100%', maxWidth: 384, marginInline: 'auto' }}>{children}</div>
        </div>
      </section>
    </div>
  );
}

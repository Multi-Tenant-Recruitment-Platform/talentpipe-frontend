import type { ReactNode } from 'react';
import { Icon, type IconName } from '../dashboard/Icon';

/**
 * One titled card on My profile: a tinted icon tile, a heading and a one-line
 * subtitle above the body. A real `<section>` named by its heading, so each
 * card is a landmark a screen-reader user can jump between.
 */
export function ProfileSection({
  id,
  icon,
  title,
  subtitle,
  children,
}: Readonly<{
  id: string;
  icon: IconName;
  title: string;
  subtitle?: string;
  children: ReactNode;
}>) {
  const headingId = `${id}-heading`;
  return (
    <section className="tp-profile-section" aria-labelledby={headingId}>
      <header className="tp-profile-section-head">
        <span className="tp-profile-section-icon">
          <Icon name={icon} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 id={headingId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="tp-profile-section-body">{children}</div>
    </section>
  );
}

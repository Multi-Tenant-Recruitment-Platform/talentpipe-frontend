import { CompanyLogo } from './CompanyLogo';

/**
 * The banner at the top of a company profile, with the logo sitting on it.
 *
 * <p>Without a cover the band still renders, as a soft brand-tinted gradient
 * rather than a dashed "no image" box: the profile should look deliberate to a
 * candidate whether or not the admin has uploaded anything. The logo overlaps
 * the bottom edge, which is the arrangement people already read as "company
 * profile" from every other product that has one.</p>
 */
export function CompanyCoverImage({
  coverUrl,
  logoUrl,
  name,
}: Readonly<{
  coverUrl: string | null;
  logoUrl: string | null;
  name: string;
}>) {
  return (
    <div style={{ position: 'relative' }}>
      <div data-testid="company-cover" className="tp-cover-band">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={`${name || 'Company'} cover`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>
      {/* Pulled up over the band's lower edge, with a white ring so it reads
          as sitting on top rather than punched out of it. */}
      <div className="tp-cover-logo">
        <CompanyLogo
          src={logoUrl}
          name={name}
          size="lg"
          style={{ boxShadow: '0 0 0 4px #fff, 0 1px 2px rgb(15 23 42 / 10%)' }}
        />
      </div>
    </div>
  );
}

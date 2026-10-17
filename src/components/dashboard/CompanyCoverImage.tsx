import { HeroBackdrop, heroSurface } from '../jobs/HeroBand';
import { CompanyLogo } from './CompanyLogo';

/**
 * The banner at the top of a company profile, with the logo sitting on it.
 *
 * <p>Without a cover the band still renders, as the product's hero surface
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
    // --- Company profile banner ---
    <div className="relative">
      {/* Without a cover, the product's own hero surface — the strip the job
          pages open with — rather than a flat fill. */}
      <div data-testid="company-cover" className={`${heroSurface} h-32 w-full rounded-2xl sm:h-44`}>
        {coverUrl ? (
          <img src={coverUrl} alt={`${name || 'Company'} cover`} className="size-full object-cover" />
        ) : (
          <HeroBackdrop />
        )}
      </div>
      {/* Pulled up over the band's lower edge, with a white ring so it reads
          as sitting on top rather than punched out of it. Positioned, so it
          paints above the band — itself positioned, to hold the hero layers. */}
      <div className="relative -mt-10 pl-6 sm:-mt-12">
        <CompanyLogo
          src={logoUrl}
          name={name}
          size="lg"
          className="shadow-[0_0_0_4px_var(--tp-surface),0_1px_2px_rgb(15_23_42/10%)]"
        />
      </div>
    </div>
  );
}

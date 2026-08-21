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
    <div className="relative">
      <div
        data-testid="company-cover"
        className="h-32 w-full overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 sm:h-44"
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt={`${name || 'Company'} cover`}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      {/* Pulled up over the band's lower edge, with a white ring so it reads
          as sitting on top rather than punched out of it. */}
      <div className="-mt-10 pl-6 sm:-mt-12">
        <CompanyLogo
          src={logoUrl}
          name={name}
          size="lg"
          className="ring-4 ring-white drop-shadow-sm"
        />
      </div>
    </div>
  );
}

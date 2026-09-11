import type { ReactNode } from 'react';
import { profileCompleteness, type CompanyFormValues } from '../../dashboard/companyProfile';
import { formatRelativeTime } from '../../utils/format';
import { Button } from '../ui/Button';
import { CompanyAtAGlance } from './CompanyAtAGlance';
import { CompanyBenefits } from './CompanyBenefits';
import { CompanyJobTaxonomy, CompanyOrganization } from './CompanyTaxonomy';
import { CompanyInformation } from './CompanyInformation';
import { CompanyOperations } from './CompanyOperations';
import { CompanyRegistrationInformation } from './CompanyRegistrationInformation';
import { CompanySocialLinks } from './CompanySocialLinks';
import { CompanyStoryInformation } from './CompanyStoryInformation';
import { ContactInformation } from './ContactInformation';
import { Icon } from './Icon';
import { LocationInformation } from './LocationInformation';

/**
 * Read-only company profile, composed from the section components.
 *
 * <p>Deliberately not a form full of disabled inputs. Disabled fields read as
 * broken rather than as "this is the current value", and they force every
 * visitor to parse a form layout to answer "what is their phone number?".</p>
 *
 * <p>One component, two presentations. `variant="profile"` is the Profile
 * Management page — roomier, headings, the presentation a candidate could be
 * shown. `variant="compact"` is the Company Settings card, where the profile
 * is one panel among several. They differ in spacing and headings only, so the
 * two screens can never disagree about what the profile actually says.</p>
 */

export type CompanyProfileVariant = 'profile' | 'compact';

function Section({
  title,
  variant,
  children,
}: {
  title: string;
  variant: CompanyProfileVariant;
  children: ReactNode;
}) {
  if (variant === 'compact') {
    return (
      <section className="border-t border-slate-100 pt-6">
        <h4 className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-400">{title}</h4>
        {children}
      </section>
    );
  }
  return (
    <section className="border-t border-slate-100 pt-8">
      <h3 className="mb-5 text-base font-semibold tracking-tight text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export function CompanyProfileView({
  values,
  logoUrl,
  coverUrl,
  updatedAt,
  canEdit,
  onEdit,
  onPreview,
  variant = 'compact',
}: {
  values: CompanyFormValues;
  logoUrl: string | null;
  coverUrl: string | null;
  updatedAt: string | null;
  canEdit: boolean;
  onEdit: () => void;
  /** Opens the candidate's-eye view. Absent on the compact variant. */
  onPreview?: () => void;
  variant?: CompanyProfileVariant;
}) {
  const profileVariant = variant === 'profile';
  const completeness = profileCompleteness(values, logoUrl !== null);
  const incomplete = completeness.missing.length > 0;

  return (
    <div className={profileVariant ? 'space-y-8' : 'space-y-6'}>
      <CompanyInformation
        values={values}
        logoUrl={logoUrl}
        coverUrl={coverUrl}
        withCover={profileVariant}
        headingLevel={profileVariant ? 'h2' : 'h3'}
      />

      <Section title="At a glance" variant={variant}>
        <CompanyAtAGlance values={values} />
      </Section>

      {(values.mission || values.vision || values.values.length > 0) && (
        <Section title="Mission, vision & values" variant={variant}>
          <CompanyStoryInformation values={values} />
        </Section>
      )}

      {values.culture && (
        <Section title="Company culture" variant={variant}>
          <p
            data-testid="company-culture"
            className="whitespace-pre-line text-sm leading-6 text-slate-700"
          >
            {values.culture}
          </p>
        </Section>
      )}

      <Section title="Benefits & perks" variant={variant}>
        <CompanyBenefits benefits={values.benefits} />
      </Section>

      <Section title="Work & operations" variant={variant}>
        <CompanyOperations values={values} />
      </Section>

      <Section title="Contact information" variant={variant}>
        <ContactInformation values={values} />
      </Section>

      {/* Hidden entirely when nothing is set on the roomy variant — an empty
          heading over three "Not set" rows is noise on a page meant to sell
          the company. Settings shows them all, because that is where they get
          filled in. */}
      {(!profileVariant || values.linkedinUrl || values.facebookUrl || values.twitterUrl) && (
        <Section title="Social links" variant={variant}>
          <CompanySocialLinks values={values} showEmpty={!profileVariant} />
        </Section>
      )}

      <Section title="Location" variant={variant}>
        <LocationInformation values={values} />
      </Section>

      {/* The tail of the page is reference data rather than presentation:
          paperwork first, then the vocabularies jobs and people are filed
          under. None of it belongs near the top, where a candidate-facing
          read starts, and none of it reaches the public preview. */}
      <Section title="Registration" variant={variant}>
        <CompanyRegistrationInformation values={values} />
      </Section>

      <Section title="Organization" variant={variant}>
        <CompanyOrganization values={values} />
      </Section>

      <Section title="Hiring vocabulary" variant={variant}>
        <CompanyJobTaxonomy values={values} />
      </Section>

      {/* Nudge, not nagging: it disappears the moment the profile is complete,
          and only someone who can act on it ever sees it. */}
      {incomplete && canEdit && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium text-slate-600">
              Profile {completeness.filled} of {completeness.total} complete
            </span>
            <span className="tabular-nums text-slate-400">{completeness.percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          {/* Naming what is missing turns a number into a next action. */}
          <p className="mt-2 text-xs text-slate-500">
            Still to add: {completeness.missing.join(', ')}.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-400">
          {updatedAt ? `Last updated ${formatRelativeTime(updatedAt)}` : 'Not edited yet'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onPreview && (
            <Button type="button" variant="ghost" onClick={onPreview}>
              <Icon name="eye" className="h-4 w-4" />
              Preview public profile
            </Button>
          )}
          {canEdit && (
            <Button type="button" variant="secondary" onClick={onEdit}>
              <Icon name="pencil" className="h-4 w-4" />
              Edit profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

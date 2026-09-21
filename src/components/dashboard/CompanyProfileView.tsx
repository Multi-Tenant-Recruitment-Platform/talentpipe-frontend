import { Flex, Progress, Typography } from 'antd';
import type { ReactNode } from 'react';
import { profileCompleteness, type CompanyFormValues } from '../../dashboard/companyProfile';
import { formatRelativeTime } from '../../utils/format';
import { Button } from '../ui/Button';
import { CompanyBenefits } from './CompanyBenefits';
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
}: Readonly<{
  title: string;
  variant: CompanyProfileVariant;
  children: ReactNode;
}>) {
  if (variant === 'compact') {
    return (
      <section style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
        <Typography.Title level={4} className="tp-legend" style={{ margin: '0 0 16px' }}>
          {title}
        </Typography.Title>
        {children}
      </section>
    );
  }
  return (
    <section style={{ borderTop: '1px solid #f1f5f9', paddingTop: 32 }}>
      <Typography.Title level={3} style={{ fontSize: 16, margin: '0 0 20px' }}>
        {title}
      </Typography.Title>
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
}: Readonly<{
  values: CompanyFormValues;
  logoUrl: string | null;
  coverUrl: string | null;
  updatedAt: string | null;
  canEdit: boolean;
  onEdit: () => void;
  /** Opens the candidate's-eye view. Absent on the compact variant. */
  onPreview?: () => void;
  variant?: CompanyProfileVariant;
}>) {
  const profileVariant = variant === 'profile';
  const completeness = profileCompleteness(values, logoUrl !== null);
  const incomplete = completeness.missing.length > 0;

  return (
    <Flex vertical gap={profileVariant ? 32 : 24}>
      <CompanyInformation
        values={values}
        logoUrl={logoUrl}
        coverUrl={coverUrl}
        withCover={profileVariant}
        headingLevel={profileVariant ? 'h2' : 'h3'}
      />

      {(values.mission || values.vision) && (
        <Section title="Mission & vision" variant={variant}>
          <CompanyStoryInformation values={values} />
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

      {/* The tail of the page is paperwork rather than presentation. It does
          not belong near the top, where a candidate-facing read starts, and
          it never reaches the public preview. */}
      <Section title="Registration" variant={variant}>
        <CompanyRegistrationInformation values={values} />
      </Section>

      {/* Nudge, not nagging: it disappears the moment the profile is complete,
          and only someone who can act on it ever sees it. */}
      {incomplete && canEdit && (
        <div
          style={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '12px 16px',
          }}
        >
          <Flex align="baseline" justify="space-between" gap={12}>
            <Typography.Text strong style={{ fontSize: 12 }}>
              Profile {completeness.filled} of {completeness.total} complete
            </Typography.Text>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
            >
              {completeness.percent}%
            </Typography.Text>
          </Flex>
          <Progress
            percent={completeness.percent}
            showInfo={false}
            size="small"
            strokeColor={{ from: '#6366f1', to: '#8b5cf6' }}
            style={{ marginBottom: 0 }}
          />
          {/* Naming what is missing turns a number into a next action. */}
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
            Still to add: {completeness.missing.join(', ')}.
          </Typography.Text>
        </div>
      )}

      <Flex
        wrap
        align="center"
        justify="space-between"
        gap={12}
        style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {updatedAt ? `Last updated ${formatRelativeTime(updatedAt)}` : 'Not edited yet'}
        </Typography.Text>
        <Flex wrap align="center" gap={8}>
          {onPreview && (
            <Button type="button" variant="ghost" onClick={onPreview}>
              <Icon name="eye" size={16} />
              Preview public profile
            </Button>
          )}
          {canEdit && (
            <Button type="button" variant="secondary" onClick={onEdit}>
              <Icon name="pencil" size={16} />
              Edit profile
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}

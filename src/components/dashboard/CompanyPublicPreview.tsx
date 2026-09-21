import { Flex, Modal, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { formatLocation, websiteLabel, type CompanyFormValues } from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { CompanyBenefits } from './CompanyBenefits';
import { CompanyCoverImage } from './CompanyCoverImage';
import { CompanySocialRow } from './CompanySocialLinks';
import { CompanyStoryInformation } from './CompanyStoryInformation';
import { Icon } from './Icon';

/**
 * The company profile as a candidate would meet it.
 *
 * <p>This is a preview, not a route. No public company page exists in the
 * router yet, and adding one is a larger architectural decision than this
 * story carries — but an admin still needs to see what they are publishing
 * before they publish it, and "looks fine in the editor" has never been the
 * same question as "reads well to a stranger".</p>
 *
 * <p>Everything here is read-only and reads from the same values the
 * management view does, so it cannot show a company that does not exist. When
 * the public route is built, this component is the thing to lift into it.</p>
 *
 * <p>Registration and tax detail is absent by construction: this is the
 * candidate's view, and none of it is any of their business.</p>
 */

/** One fact in the summary strip. */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div style={{ minWidth: 0 }}>
      <dt
        style={{
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          color: '#94a3b8',
        }}
      >
        {label}
      </dt>
      {/* Wraps rather than truncates: "Information Technol…" in the one place
          a candidate looks for the industry is worse than a second line. */}
      <dd style={{ marginTop: 2, marginInlineStart: 0, fontWeight: 500, overflowWrap: 'break-word' }}>
        {value || '—'}
      </dd>
    </div>
  );
}

export function CompanyPublicPreview({
  open,
  values,
  logoUrl,
  coverUrl,
  onClose,
}: Readonly<{
  open: boolean;
  values: CompanyFormValues;
  logoUrl: string | null;
  coverUrl: string | null;
  onClose: () => void;
}>) {
  const location = formatLocation(values);

  return (
    // antd's Modal supplies the overlay, the focus trap, Escape-to-close and
    // the return of focus to whatever opened it — all of which this component
    // used to carry by hand.
    //
    // It stays mounted and is driven by `open` rather than being conditionally
    // rendered: returning focus to the button that opened it happens as the
    // dialog closes, and unmounting mid-close throws that away, leaving focus
    // stranded on <body>. Nothing here holds state, so staying mounted costs
    // nothing — unlike the invite dialog, which must unmount to reset its form.
    <Modal
      open={open}
      onCancel={onClose}
      width={840}
      footer={null}
      closable={false}
      styles={{ body: { paddingTop: 0 } }}
      title={
        /* Says plainly that this is a rehearsal, not the live page. */
        <Flex align="center" justify="space-between" gap={12}>
          <Typography.Text type="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <Icon name="eye" size={16} />
            Preview — this is how your profile reads to a candidate
          </Typography.Text>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x-mark" size={16} />
            Close
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={28} style={{ paddingTop: 8 }}>
        <div>
          <CompanyCoverImage coverUrl={coverUrl} logoUrl={logoUrl} name={values.name} />
          <Flex wrap align="flex-end" justify="space-between" gap={12} style={{ marginTop: 16 }}>
            <div style={{ minWidth: 0 }}>
              <Typography.Title id="public-preview-title" level={2} style={{ fontSize: 24, margin: 0 }}>
                {values.name || 'Unnamed company'}
              </Typography.Title>
              {values.tagline && (
                <Typography.Paragraph style={{ margin: '4px 0 0' }}>
                  {values.tagline}
                </Typography.Paragraph>
              )}
              <Flex wrap align="center" gap={16} style={{ marginTop: 6 }}>
                {location && (
                  <Typography.Text type="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="map-pin" size={16} />
                    {location}
                  </Typography.Text>
                )}
                {values.foundedYear && (
                  <Typography.Text type="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="calendar" size={16} />
                    Founded {values.foundedYear}
                  </Typography.Text>
                )}
              </Flex>
            </div>
            <CompanySocialRow values={values} />
          </Flex>
        </div>

        <section>
          <Typography.Title level={3} style={{ fontSize: 14, margin: 0 }}>
            About us
          </Typography.Title>
          <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-line' }}>
            {values.description || 'This company has not written a description yet.'}
          </Typography.Paragraph>
        </section>

        <dl className="tp-preview-facts">
          <Fact label="Industry" value={values.industry} />
          <Fact label="Company size" value={values.size} />
          <Fact label="Location" value={location} />
          <Fact label="Website" value={values.website ? websiteLabel(values.website) : ''} />
        </dl>

        {(values.mission || values.vision) && (
          <section>
            <Typography.Title level={3} style={{ fontSize: 14, margin: '0 0 12px' }}>
              What we stand for
            </Typography.Title>
            <CompanyStoryInformation values={values} />
          </section>
        )}

        {values.benefits.length > 0 && (
          <section>
            <Typography.Title level={3} style={{ fontSize: 14, margin: '0 0 12px' }}>
              Benefits &amp; perks
            </Typography.Title>
            <CompanyBenefits benefits={values.benefits} />
          </section>
        )}

        <Flex
          wrap
          align="center"
          justify="space-between"
          gap={12}
          component="section"
          style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24 }}
        >
          <div style={{ minWidth: 0 }}>
            {/* The recruitment address wins where there is one — that is the
                inbox a candidate's question should land in. */}
            {(values.hrEmail || values.email) && (
              <Typography.Text type="secondary">
                Get in touch: <Typography.Text strong>{values.hrEmail || values.email}</Typography.Text>
              </Typography.Text>
            )}
          </div>
          {/* The jobs board is a real route, so this goes somewhere rather
              than miming a link a candidate would find broken. An anchor,
              not a Button — it navigates, and nesting one in the other is
              invalid markup. */}
          <Link to="/jobs" onClick={onClose} className="tp-cta-link">
            <Icon name="briefcase" size={16} />
            View open positions
          </Link>
        </Flex>
      </Flex>
    </Modal>
  );
}

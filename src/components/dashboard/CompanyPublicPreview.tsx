import {
  CalendarOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { Flex, Modal, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { formatLocation, websiteLabel, type CompanyFormValues } from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { CompanyBenefits } from './CompanyBenefits';
import { CompanyCoverImage } from './CompanyCoverImage';
import { CompanySocialRow } from './CompanySocialLinks';
import { CompanyStoryInformation } from './CompanyStoryInformation';

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
    <div className="min-w-0">
      <dt className="text-caption font-medium uppercase tracking-[0.03em] text-slate-400">{label}</dt>
      {/* Wraps rather than truncates: "Information Technol…" in the one place
          a candidate looks for the industry is worse than a second line. */}
      <dd className="ms-0 mt-0.5 font-medium wrap-break-word">
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
          <Typography.Text type="secondary" className="inline-flex items-center gap-2 text-caption">
            <EyeOutlined aria-hidden className="text-[16px]" />
            Preview — this is how your profile reads to a candidate
          </Typography.Text>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
            icon={<CloseOutlined aria-hidden className="text-[16px]" />}
          >
            Close
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={28} className="pt-2">
        <div>
          <CompanyCoverImage coverUrl={coverUrl} logoUrl={logoUrl} name={values.name} />
          <Flex wrap align="flex-end" justify="space-between" gap={12} className="mt-4">
            <div className="min-w-0">
              <Typography.Title id="public-preview-title" level={2} className="m-0 text-heading">
                {values.name || 'Unnamed company'}
              </Typography.Title>
              {values.tagline && <Typography.Paragraph className="m-0 mt-1">{values.tagline}</Typography.Paragraph>}
              <Flex wrap align="center" gap={16} className="mt-1.5">
                {location && (
                  <Typography.Text type="secondary" className="inline-flex items-center gap-1.5">
                    <EnvironmentOutlined aria-hidden className="text-[16px]" />
                    {location}
                  </Typography.Text>
                )}
                {values.foundedYear && (
                  <Typography.Text type="secondary" className="inline-flex items-center gap-1.5">
                    <CalendarOutlined aria-hidden className="text-[16px]" />
                    Founded {values.foundedYear}
                  </Typography.Text>
                )}
              </Flex>
            </div>
            <CompanySocialRow values={values} />
          </Flex>
        </div>

        <section>
          <Typography.Title level={3} className="m-0 text-body">
            About us
          </Typography.Title>
          <Typography.Paragraph className="mt-2 mb-0 whitespace-pre-line">
            {values.description || 'This company has not written a description yet.'}
          </Typography.Paragraph>
        </section>

        {/* Summary strip on the candidate preview. A real <dl> again, so it cannot be
            an antd Row — see the note on .tp-detail-grid. */}
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-4">
          <Fact label="Industry" value={values.industry} />
          <Fact label="Company size" value={values.size} />
          <Fact label="Location" value={location} />
          <Fact label="Website" value={values.website ? websiteLabel(values.website) : ''} />
        </dl>

        {(values.mission || values.vision) && (
          <section>
            <Typography.Title level={3} className="m-0 mb-3 text-body">
              What we stand for
            </Typography.Title>
            <CompanyStoryInformation values={values} />
          </section>
        )}

        {values.benefits.length > 0 && (
          <section>
            <Typography.Title level={3} className="m-0 mb-3 text-body">
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
          className="border-t border-slate-100 pt-6"
        >
          <div className="min-w-0">
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
          <Link to="/" onClick={onClose} className="tp-cta-link">
            <SolutionOutlined aria-hidden className="text-[16px]" />
            View open positions
          </Link>
        </Flex>
      </Flex>
    </Modal>
  );
}

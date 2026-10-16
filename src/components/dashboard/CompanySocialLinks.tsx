import { LinkOutlined } from '@ant-design/icons';
import { Flex } from 'antd';
import {
  SOCIAL_FIELDS,
  websiteLabel,
  FIELD_LABELS,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { DetailItem } from './DetailItem';
import { detailGrid } from '../ui/classes';

/**
 * The company's presence elsewhere: LinkedIn, Facebook, X.
 *
 * <p>Text labels and a generic link mark rather than brand glyphs. A
 * hand-drawn approximation of someone else's logo looks wrong to anyone who
 * knows the real one, and the platform names are unambiguous on their own.</p>
 *
 * <p>In the read view the whole section disappears when none are set — an
 * empty "Social links" heading with three "Not set" rows is noise on a page
 * meant to sell the company. The form still offers all three.</p>
 */
export function CompanySocialLinks({
  values,
  showEmpty = false,
}: Readonly<{
  values: CompanyFormValues;
  /** Render rows for unset links too. Off for candidate-facing surfaces. */
  showEmpty?: boolean;
}>) {
  const present = SOCIAL_FIELDS.filter((field) => values[field] !== '');
  const shown = showEmpty ? SOCIAL_FIELDS : present;

  if (shown.length === 0) {
    return null;
  }

  return (
    <dl className={detailGrid}>
      {shown.map((field) => (
        <DetailItem
          key={field}
          icon={LinkOutlined}
          label={FIELD_LABELS[field]}
          value={values[field] ? websiteLabel(values[field]) : ''}
          href={values[field] || undefined}
          external
          testId={`company-${field}`}
        />
      ))}
    </dl>
  );
}

/**
 * Compact row of social links for the candidate-facing preview, where the
 * labelled-list treatment would be heavier than the content deserves.
 */
// Compact social links on the candidate-facing preview, where the labelled
// detail-list treatment would be heavier than the content deserves.
export function CompanySocialRow({ values }: Readonly<{ values: CompanyFormValues }>) {
  const present = SOCIAL_FIELDS.filter((field) => values[field] !== '');
  if (present.length === 0) {
    return null;
  }

  return (
    <Flex wrap gap={8}>
      {present.map((field) => (
        <a
          key={field}
          href={values[field]}
          target="_blank"
          rel="noreferrer noopener"
          data-testid={`preview-${field}`}
          className="inline-flex items-center gap-1.5 rounded-pill border border-slate-200 px-3 py-1.5 text-caption font-medium text-slate-600 no-underline transition-[background,border-color,color] duration-(--tp-motion-base) ease-standard hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <LinkOutlined aria-hidden className="text-[14px] opacity-55" />
          {FIELD_LABELS[field]}
        </a>
      ))}
    </Flex>
  );
}

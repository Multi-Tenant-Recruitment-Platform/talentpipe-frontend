import { Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import type { IconComponent } from '../ui/icon';

/**
 * One labelled fact in a profile section: icon, label, value.
 *
 * <p>Shared by the contact and location blocks so a change to how "not set"
 * reads lands in both. An empty value is stated rather than left blank — a gap
 * where a phone number should be is indistinguishable from a rendering bug.</p>
 *
 * <p>Kept as real `<dt>`/`<dd>` rather than antd's `Descriptions`: the pair is
 * the correct semantic for a term and its value, and `Descriptions` offers no
 * hook for the per-field test ids the profile suite reads.</p>
 */
export function DetailItem({
  icon: Glyph,
  label,
  value,
  href,
  external = false,
  testId,
}: Readonly<{
  icon: IconComponent;
  label: string;
  /** Display text. Empty string means "not set". */
  value: string;
  /** When given and the value is non-empty, the value renders as a link. */
  href?: string;
  external?: boolean;
  testId?: string;
}>) {
  const { token } = theme.useToken();

  let content: ReactNode;
  if (value === '') {
    content = <Typography.Text type="secondary">Not set</Typography.Text>;
  } else if (href) {
    content = (
      <Typography.Link
        href={href}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        className="block overflow-hidden text-ellipsis font-medium"
      >
        {value}
      </Typography.Link>
    );
  } else {
    content = <Typography.Text>{value}</Typography.Text>;
  }

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center"
        style={{
          borderRadius: token.borderRadius,
          background: token.colorFillQuaternary,
          color: token.colorTextTertiary,
        }}
      >
        <Glyph aria-hidden className="text-[16px]" />
      </span>
      <div className="min-w-0">
        <dt className="text-caption font-medium uppercase tracking-[0.03em]" style={{ color: token.colorTextTertiary }}>
          {label}
        </dt>
        <dd className="ms-0 mt-0.5 min-w-0" data-testid={testId}>
          {content}
        </dd>
      </div>
    </div>
  );
}

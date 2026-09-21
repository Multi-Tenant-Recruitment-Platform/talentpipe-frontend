import { Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

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
  icon,
  label,
  value,
  href,
  external = false,
  testId,
}: Readonly<{
  icon: IconName;
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
        style={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {value}
      </Typography.Link>
    );
  } else {
    content = <Typography.Text>{value}</Typography.Text>;
  }

  return (
    <div style={{ display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: 12 }}>
      <span
        style={{
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: token.borderRadius,
          background: token.colorFillQuaternary,
          color: token.colorTextTertiary,
        }}
      >
        <Icon name={icon} size={16} />
      </span>
      <div style={{ minWidth: 0 }}>
        <dt
          style={{
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            color: token.colorTextTertiary,
          }}
        >
          {label}
        </dt>
        <dd style={{ marginTop: 2, marginInlineStart: 0, minWidth: 0 }} data-testid={testId}>
          {content}
        </dd>
      </div>
    </div>
  );
}

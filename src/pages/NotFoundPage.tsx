import { Flex, Result, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { Icon } from '../components/dashboard/Icon';
import { fontSize, primary } from '../theme/tokens';

/**
 * Public 404. Without it, a mistyped or stale link renders the header over an
 * empty page, which reads as the site being broken rather than the link.
 */
export function NotFoundPage() {
  return (
    <Result
      style={{ maxWidth: 512, marginInline: 'auto', paddingBlock: 48 }}
      icon={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: primary[50],
            color: primary[600],
          }}
        >
          <Icon name="search" size={28} />
        </span>
      }
      title={
        <Typography.Title level={1} style={{ fontSize: fontSize.heading, margin: 0 }}>
          We couldn&rsquo;t find that page
        </Typography.Title>
      }
      subTitle={
        <>
          The link may be mistyped, or the page may have moved.{' '}
          <Typography.Text type="secondary">(Error 404)</Typography.Text>
        </>
      }
      extra={
        <Flex wrap justify="center" gap={12}>
          <Link to="/" className="tp-cta-link">
            <Icon name="arrow-left" size={16} />
            Back to home
          </Link>
          <Link to="/jobs" className="tp-cta-link tp-cta-link-ghost">
            Browse jobs
          </Link>
        </Flex>
      }
    />
  );
}

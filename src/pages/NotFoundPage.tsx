import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { Flex, Result, Typography } from 'antd';
import { Link } from 'react-router-dom';

/**
 * Public 404. Without it, a mistyped or stale link renders the header over an
 * empty page, which reads as the site being broken rather than the link.
 */
export function NotFoundPage() {
  return (
    <Result
      className="mx-auto max-w-128 py-12"
      icon={
        <span className="inline-flex size-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <SearchOutlined aria-hidden className="text-[28px]" />
        </span>
      }
      title={
        <Typography.Title level={1} className="m-0 text-heading">
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
            <ArrowLeftOutlined aria-hidden className="text-[16px]" />
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

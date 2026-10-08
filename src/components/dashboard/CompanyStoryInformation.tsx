import { Col, Row, Typography } from 'antd';
import type { CompanyFormValues } from '../../dashboard/companyProfile';

/**
 * Mission and vision — what the company says it is for.
 *
 * <p>Each part disappears when unset rather than showing "Not set": these are
 * statements a company either has or has not written, and an empty "Mission"
 * heading on a candidate-facing page is worse than no heading at all.</p>
 */
export function CompanyStoryInformation({ values }: Readonly<{ values: CompanyFormValues }>) {
  if (values.mission === '' && values.vision === '') {
    return null;
  }

  return (
    <Row gutter={[20, 20]}>
      {values.mission && (
        <Col xs={24} sm={12}>
          <Typography.Title level={4} className="tp-legend" style={{ margin: 0 }}>
            Mission
          </Typography.Title>
          <Typography.Paragraph
            data-testid="company-mission"
            style={{ marginTop: 6, marginBottom: 0, whiteSpace: 'pre-line' }}
          >
            {values.mission}
          </Typography.Paragraph>
        </Col>
      )}
      {values.vision && (
        <Col xs={24} sm={12}>
          <Typography.Title level={4} className="tp-legend" style={{ margin: 0 }}>
            Vision
          </Typography.Title>
          <Typography.Paragraph
            data-testid="company-vision"
            style={{ marginTop: 6, marginBottom: 0, whiteSpace: 'pre-line' }}
          >
            {values.vision}
          </Typography.Paragraph>
        </Col>
      )}
    </Row>
  );
}

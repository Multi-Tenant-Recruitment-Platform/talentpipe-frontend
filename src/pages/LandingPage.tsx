import { Card, Col, Divider, Flex, Row, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { fontSize } from '../theme/tokens';

/** Public landing shell: name, one-liner, and a clear entry point per persona. */
export function LandingPage() {
  return (
    <Flex vertical align="center" style={{ paddingBlock: 64, textAlign: 'center' }}>
      <Typography.Title level={1} style={{ fontSize: fontSize.hero, maxWidth: 672, margin: 0 }}>
        TalentPipe
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ maxWidth: 576, fontSize: fontSize.title, marginTop: 24 }}>
        The multi-tenant recruitment intelligence platform — one place for your jobs, candidates and
        hiring pipeline.
      </Typography.Paragraph>

      {/* Two audiences, two doors — employers and job seekers each get their own. */}
      <Row gutter={[24, 24]} style={{ width: '100%', maxWidth: 768, marginTop: 48 }}>
        <Col xs={24} sm={12}>
          <Card style={{ height: '100%', textAlign: 'left' }} styles={{ body: { padding: 32 } }}>
            <Flex vertical style={{ height: '100%' }}>
              <Typography.Title level={2} style={{ fontSize: fontSize.title, margin: 0 }}>
                For employers
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ flex: 1, marginTop: 8 }}>
                Create your company workspace, invite your hiring team, and manage your pipeline end
                to end.
              </Typography.Paragraph>
              <Link to="/register" className="tp-cta-link" style={{ marginTop: 24 }}>
                Register your company
              </Link>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card style={{ height: '100%', textAlign: 'left' }} styles={{ body: { padding: 32 } }}>
            <Flex vertical style={{ height: '100%' }}>
              <Typography.Title level={2} style={{ fontSize: fontSize.title, margin: 0 }}>
                For job seekers
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ flex: 1, marginTop: 8 }}>
                Create one candidate account, apply to every company hiring on TalentPipe, and get
                discovered again.
              </Typography.Paragraph>
              <Link to="/register-candidate" className="tp-cta-link tp-cta-link-ghost" style={{ marginTop: 24 }}>
                Create a candidate account
              </Link>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Flex align="center" gap={24} style={{ marginTop: 40 }}>
        <Link to="/login">Already have an account? Log in</Link>
        <Divider type="vertical" aria-hidden="true" style={{ margin: 0 }} />
        <Link to="/jobs">Browse open positions →</Link>
      </Flex>
    </Flex>
  );
}

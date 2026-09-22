import { Col, Flex, Progress, Row, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useCan } from '../../auth/useCan';
import { Badge, type BadgeTone } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { Icon } from '../../components/dashboard/Icon';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { Button } from '../../components/ui/Button';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { useCompanyProfileContext } from '../../dashboard/CompanyProfileContext';
import { planUsage } from '../../data/mockDashboard';

/**
 * Company settings — the workspace identity and the plan.
 *
 * <p>The company profile itself is not repeated here: it lives on Profile
 * Management, and a second copy of the same form on this page was only a
 * second place to look for it. The profile controller is still read, for the
 * name and status the workspace card shows.</p>
 */

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: 'emerald',
  TRIAL: 'amber',
  SUSPENDED: 'red',
};

/** 'ACTIVE' → 'Active'. Keeps an unknown future status readable. */
function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function CompanySettingsPage() {
  const controller = useCompanyProfileContext();
  const allow = useCan();

  // Real seat consumption from GET /team — only the tier and the ceiling are
  // still mock, since no billing endpoint exposes them yet.
  const { seatsUsed, loading: seatsLoading } = useTeamSummary();
  const seatsPercent = Math.min(100, Math.round((seatsUsed / planUsage.seatsTotal) * 100));
  const seatsLeft = Math.max(0, planUsage.seatsTotal - seatsUsed);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Company settings"
        subtitle="Manage your workspace identity and plan."
      />

      <div style={{ maxWidth: 896, marginInline: 'auto' }}>
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} lg={12}>
            <Card title="Workspace" subtitle="Your tenant identity on TalentPipe">
              <Flex vertical gap={16}>
                <Flex align="center" justify="space-between" gap={12}>
                  <Typography.Text className="tp-legend">Company</Typography.Text>
                  {controller.profile ? (
                    <Typography.Text strong ellipsis>
                      {controller.profile.name}
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  )}
                </Flex>
                <Flex align="center" justify="space-between" gap={12}>
                  <Typography.Text className="tp-legend">Status</Typography.Text>
                  {/* Nothing is known before the profile lands, and a badge
                      reading "Unknown" is a claim about the workspace rather
                      than an admission that we have not looked yet. */}
                  {controller.profile ? (
                    <Badge tone={STATUS_TONES[controller.profile.status] ?? 'slate'}>
                      {statusLabel(controller.profile.status)}
                    </Badge>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  )}
                </Flex>
              </Flex>
            </Card>
          </Col>

          {allow('billing.view') && (
            <Col xs={24} lg={12}>
              <Card title="Plan & usage" subtitle="Current subscription">
                <Flex align="center" justify="space-between">
                  <Typography.Text strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="sparkles" size={16} style={{ color: '#8b5cf6' }} />
                    {planUsage.tier} plan
                  </Typography.Text>
                  <Badge tone="indigo">Monthly</Badge>
                </Flex>
                <div style={{ marginTop: 16 }}>
                  <Flex align="baseline" justify="space-between">
                    <Typography.Text type="secondary">Team seats</Typography.Text>
                    <Typography.Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {seatsLoading ? '—' : `${seatsUsed} / ${planUsage.seatsTotal}`}
                    </Typography.Text>
                  </Flex>
                  <Progress
                    percent={seatsPercent}
                    showInfo={false}
                    strokeColor={{ from: '#6366f1', to: '#8b5cf6' }}
                    style={{ marginBottom: 0 }}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left — invite HR managers and
                    interviewers anytime.
                  </Typography.Text>
                </div>
                <Button
                  variant="secondary"
                  style={{ marginTop: 16, width: '100%' }}
                  title="Billing arrives in a later sprint"
                >
                  Manage plan
                </Button>
              </Card>
            </Col>
          )}
        </Row>

        {/* The profile moved out of this page; say where it went, so nobody
            concludes it was removed. */}
        <Typography.Paragraph
          type="secondary"
          style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}
        >
          <Icon name="building" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
          Company details are managed on <Link to="/dashboard/profile">Profile Management</Link>.
        </Typography.Paragraph>
      </div>
    </>
  );
}

import { BankOutlined, StarOutlined } from '@ant-design/icons';
import { Col, Flex, Progress, Row, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useCan } from '../../auth/useCan';
import { Badge, type BadgeTone } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { HiringSettingsCard } from '../../components/dashboard/HiringSettingsCard';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { Button } from '../../components/ui/Button';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { useCompanyProfileContext } from '../../dashboard/CompanyProfileContext';
import { planUsage } from '../../data/mockDashboard';
import { primary } from '../../theme/tokens';

/**
 * Company settings — the workspace identity, how hiring works here, and the
 * plan.
 *
 * <p>The company profile itself is not repeated here: it lives on Profile
 * Management, and a second copy of the same form on this page was only a
 * second place to look for it. The profile controller is still read, for the
 * name and status the workspace card shows.</p>
 */

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  TRIAL: 'warning',
  SUSPENDED: 'danger',
};

/** 'ACTIVE' → 'Active'. Keeps an unknown future status readable. */
function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function CompanySettingsPage() {
  const controller = useCompanyProfileContext();
  const allow = useCan();

  // Real seat consumption from GET /team, and the tier from the company
  // profile — only the ceiling is still mock, since no billing endpoint
  // exposes it yet.
  const { seatsUsed, loading: seatsLoading } = useTeamSummary();
  const seatsPercent = Math.min(100, Math.round((seatsUsed / planUsage.seatsTotal) * 100));
  const seatsLeft = Math.max(0, planUsage.seatsTotal - seatsUsed);

  return (
    <>
      <PageHeader
        title="Company settings"
        subtitle="Manage your workspace identity, hiring defaults and plan."
      />

      <div>
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
                    <Badge tone={STATUS_TONES[controller.profile.status] ?? 'neutral'}>
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
                  {/* The gap sits on a plain wrapper: `Typography.Text strong` wraps
                      its children in one <strong>, which leaves a flex gap on
                      the Text itself nothing to space. */}
                  <span className="inline-flex items-center gap-2">
                    <StarOutlined aria-hidden className="text-[16px] text-primary-600" />
                    <Typography.Text strong>
                      {controller.profile ? `${statusLabel(controller.profile.planTier)} plan` : '—'}
                    </Typography.Text>
                  </span>
                  <Badge>Monthly</Badge>
                </Flex>
                <div className="mt-4">
                  <Flex align="baseline" justify="space-between">
                    <Typography.Text type="secondary">Team seats</Typography.Text>
                    <Typography.Text strong className="tabular-nums">
                      {seatsLoading ? '—' : `${seatsUsed} / ${planUsage.seatsTotal}`}
                    </Typography.Text>
                  </Flex>
                  <Progress
                    percent={seatsPercent}
                    showInfo={false}
                    strokeColor={primary[600]}
                    className="mb-0"
                  />
                  <Typography.Text type="secondary" className="text-caption">
                    {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left — invite teammates with any of
                    your roles, anytime.
                  </Typography.Text>
                </div>
                <Button
                  variant="secondary"
                  className="mt-4 w-full"
                  title="Billing arrives in a later sprint"
                >
                  Manage plan
                </Button>
              </Card>
            </Col>
          )}

          <Col xs={24}>
            <HiringSettingsCard />
          </Col>
        </Row>

        {/* The profile moved out of this page; say where it went, so nobody
            concludes it was removed. */}
        <Typography.Paragraph type="secondary" className="mt-4 mb-0 text-caption">
          <BankOutlined aria-hidden className="text-[14px]" />{' '}
          Company details are managed on <Link to="/dashboard/profile">Profile Management</Link>.
        </Typography.Paragraph>
      </div>
    </>
  );
}

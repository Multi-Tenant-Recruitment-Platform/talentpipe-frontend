import { Card as AntCard, Col, Flex, Row, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Badge } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { HiringFunnel } from '../../components/dashboard/HiringFunnel';
import { Icon, type IconName } from '../../components/dashboard/Icon';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { hiringFunnel, jobPipelines, pipelineInsights } from '../../data/mockDashboard';
import type { JobPipeline } from '../../data/mockDashboard';

const STAGE_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
const STAGE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#10b981'];

/**
 * Recruitment pipeline: the full-funnel view of how candidates move from
 * application to hire, which stage is the bottleneck, and how each open job
 * is filling its stages.
 */
export function PipelinePage() {
  const totalInFunnel = hiringFunnel[0]?.count ?? 0;
  const hired = hiringFunnel[hiringFunnel.length - 1]?.count ?? 0;
  const overallConversion = totalInFunnel > 0 ? Math.round((hired / totalInFunnel) * 1000) / 10 : 0;

  const insights: { icon: IconName; label: string; value: string; hint: string; tone: string }[] = [
    {
      icon: 'bolt',
      label: 'Fastest stage',
      value: pipelineInsights.fastestStage.label,
      hint: `~${pipelineInsights.fastestStage.days} days on average`,
      tone: '#059669',
    },
    {
      icon: 'clock',
      label: 'Slowest stage',
      value: pipelineInsights.slowestStage.label,
      hint: `~${pipelineInsights.slowestStage.days} days on average`,
      tone: '#d97706',
    },
    {
      icon: 'globe',
      label: 'Top candidate source',
      value: pipelineInsights.topSource.label,
      hint: `${pipelineInsights.topSource.share}% of all applicants`,
      tone: '#4f46e5',
    },
  ];

  const columns: ColumnsType<JobPipeline> = [
    {
      key: 'job',
      title: 'Job',
      render: (_, job) => (
        <>
          <Typography.Text strong style={{ display: 'block' }}>
            {job.title}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {job.department} · {job.location}
          </Typography.Text>
        </>
      ),
    },
    {
      key: 'daysOpen',
      title: 'Open for',
      render: (_, job) => <Typography.Text type="secondary">{job.daysOpen} days</Typography.Text>,
    },
    {
      key: 'pipeline',
      title: 'Pipeline',
      width: '40%',
      render: (_, job) => {
        const total = job.stageCounts.reduce((sum, n) => sum + n, 0);
        return (
          <>
            {/* A stacked bar rather than five separate meters: the point is the
                proportions between stages, which only a shared track shows. */}
            <div
              className="tp-stacked-bar"
              title={job.stageCounts.map((n, i) => `${STAGE_LABELS[i]}: ${n}`).join(' · ')}
            >
              {job.stageCounts.map((count, i) =>
                count > 0 ? (
                  <span
                    key={STAGE_LABELS[i]}
                    style={{ width: `${(count / total) * 100}%`, background: STAGE_COLORS[i] }}
                  />
                ) : null,
              )}
            </div>
            <Typography.Text
              type="secondary"
              style={{ display: 'block', marginTop: 6, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
            >
              {job.stageCounts.map((n, i) => `${STAGE_LABELS[i].slice(0, 1)}${n}`).join('  ')}
            </Typography.Text>
          </>
        );
      },
    },
    {
      key: 'total',
      title: 'Candidates',
      render: (_, job) => (
        <Typography.Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {job.stageCounts.reduce((sum, n) => sum + n, 0)}
        </Typography.Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, job) => (
        <Badge tone={job.status === 'OPEN' ? 'emerald' : 'amber'}>
          {job.status === 'OPEN' ? 'Open' : 'On hold'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Recruitment pipeline"
        subtitle="Understand how candidates flow through your hiring process — and where they get stuck."
      />

      {/* Insight cards */}
      <Row gutter={[20, 20]}>
        {insights.map((insight) => (
          <Col xs={24} sm={8} key={insight.label}>
            <AntCard style={{ height: '100%' }} styles={{ body: { padding: 20 } }}>
              <Flex align="center" gap={16}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 12,
                    background: `${insight.tone}1a`,
                    color: insight.tone,
                  }}
                >
                  <Icon name={insight.icon} size={20} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    {insight.label}
                  </Typography.Text>
                  <Typography.Text strong style={{ display: 'block', fontSize: 16 }}>
                    {insight.value}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {insight.hint}
                  </Typography.Text>
                </div>
              </Flex>
            </AntCard>
          </Col>
        ))}
      </Row>

      {/* Company-wide funnel */}
      <div style={{ marginTop: 24 }}>
        <Card
          title="Company-wide funnel"
          subtitle={`${totalInFunnel.toLocaleString()} applications in the last 90 days · ${overallConversion}% end-to-end conversion`}
        >
          <HiringFunnel stages={hiringFunnel} />
          <Alert tone="warning" role="status" style={{ marginTop: 24 }}>
            <strong>Screening is your bottleneck.</strong> Candidates wait ~6 days on average before
            moving forward. Consider inviting another interviewer or tightening your screening
            criteria to keep the pipeline flowing.
          </Alert>
        </Card>
      </div>

      {/* Per-job pipelines */}
      <div style={{ marginTop: 24 }}>
        <Card
          title="Pipeline by job"
          subtitle="Candidates in each stage, per open role"
          bodyClassName="tp-roster-body"
          action={
            <Flex wrap align="center" gap={12}>
              {STAGE_LABELS.map((label, i) => (
                <Typography.Text
                  key={label}
                  type="secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STAGE_COLORS[i],
                    }}
                  />
                  {label}
                </Typography.Text>
              ))}
            </Flex>
          }
        >
          <Table<JobPipeline>
            rowKey="id"
            columns={columns}
            dataSource={jobPipelines}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      </div>
    </>
  );
}

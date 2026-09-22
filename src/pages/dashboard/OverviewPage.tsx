import { Col, Flex, List, Row, Timeline, Typography } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { teamApi } from '../../api/team';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Avatar } from '../../components/dashboard/Avatar';
import { Badge } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { HiringFunnel } from '../../components/dashboard/HiringFunnel';
import { Icon, type IconName } from '../../components/dashboard/Icon';
import { InviteMemberModal, type InviteFormValues } from '../../components/dashboard/InviteMemberModal';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { describeTeamError, type TeamErrorPlan } from '../../dashboard/teamErrors';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import {
  activityFeed,
  hiringFunnel,
  overviewStats,
  recruitmentHealth,
  upcomingInterviews,
} from '../../data/mockDashboard';

const INTERVIEW_TYPE_BADGE: Record<string, { tone: 'sky' | 'violet' | 'amber'; label: string }> = {
  VIDEO: { tone: 'sky', label: 'Video' },
  ONSITE: { tone: 'violet', label: 'On-site' },
  PHONE: { tone: 'amber', label: 'Phone' },
};

const ACTIVITY_TONES: Record<string, string> = {
  'user-plus': '#4f46e5',
  briefcase: '#7c3aed',
  calendar: '#0284c7',
  check: '#059669',
  envelope: '#d97706',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Company admin overview: headline KPIs, the hiring funnel, recruitment
 * health, today's interviews and the latest activity — everything an admin
 * needs to understand the state of hiring at a glance.
 */
export function OverviewPage() {
  const { user } = useAuth();
  const allow = useCan();
  const { pendingInvites, loading: teamLoading, refresh: refreshTeam } = useTeamSummary();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<TeamErrorPlan | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  async function handleInvite(values: InviteFormValues) {
    setError(null);
    setInviteError(null);
    setInviteSubmitting(true);
    try {
      await teamApi.invite({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
      });
      // Keeps the pending-invite KPI and the sidebar seat gauge honest without
      // making the user reload.
      await refreshTeam();
      setInviteOpen(false);
      setNotice(`Invitation sent to ${values.email} — they'll join as ${values.role === 'HR_MANAGER' ? 'an HR Manager' : 'an Interviewer'} once they accept.`);
    } catch (err: unknown) {
      // Into the dialog, not the page: a page-level alert renders behind the
      // modal backdrop, so the admin would see nothing at all.
      const plan = describeTeamError(err, 'invite');
      setInviteError(plan);
    } finally {
      setInviteSubmitting(false);
    }
  }

  const healthMetrics: { icon: IconName; label: string; value: string; hint: string; tone: string }[] = [
    {
      icon: 'clock',
      label: 'Avg. time-to-hire',
      value: `${recruitmentHealth.avgTimeToHireDays} days`,
      hint: '2 days faster than last quarter',
      tone: '#4f46e5',
    },
    {
      icon: 'check',
      label: 'Offer acceptance',
      value: `${recruitmentHealth.offerAcceptanceRate}%`,
      hint: '11 of 13 offers accepted',
      tone: '#059669',
    },
    {
      icon: 'sparkles',
      label: 'Hired this month',
      value: String(recruitmentHealth.hiredThisMonth),
      hint: 'Across 3 departments',
      tone: '#7c3aed',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`${greeting()}, ${user?.firstName ?? 'there'}`}
        subtitle={`Here's what's happening with your hiring — ${today}`}
      >
        <Button
          variant="secondary"
          onClick={() => setNotice('Job posting arrives with the Job module — for now, invite your hiring team and shape your pipeline.')}
        >
          <Icon name="briefcase" size={16} />
          Post a job
        </Button>
        {/* Inviting is a COMPANY_ADMIN action; anyone else would only get a
            403 from the API, so they never see the button. */}
        {allow('team.invite') && (
          <Button variant="primary" onClick={() => setInviteOpen(true)}>
            <Icon name="user-plus" size={16} />
            Invite member
          </Button>
        )}
      </PageHeader>

      {notice && (
        <Alert tone="info" onDismiss={() => setNotice(null)} style={{ marginBottom: 24 }}>
          {notice}
        </Alert>
      )}

      {error && (
        <Alert tone="error" style={{ marginBottom: 24 }}>
          {error}
        </Alert>
      )}

      {/* KPI row */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            label="Active jobs"
            value={String(overviewStats.activeJobs)}
            icon="briefcase"
            tone="indigo"
            delta={{ value: '+2', direction: 'up', hint: 'this month' }}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            label="Candidates in pipeline"
            value={overviewStats.candidatesInPipeline.toLocaleString()}
            icon="users"
            tone="violet"
            delta={{ value: '+18%', direction: 'up', hint: 'vs last week' }}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            label="Interviews this week"
            value={String(overviewStats.interviewsThisWeek)}
            icon="calendar"
            tone="emerald"
            delta={{ value: '+4', direction: 'up', hint: 'vs last week' }}
          />
        </Col>
        {/* The only KPI on this row with a real backend behind it — the rest
            wait on the Job / Candidate / Interview modules. */}
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            label="Pending invites"
            value={teamLoading ? '—' : String(pendingInvites.length)}
            icon="envelope"
            tone="amber"
          />
        </Col>
      </Row>

      {/* Funnel + health */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Hiring funnel"
            subtitle="All open jobs · last 90 days"
            action={
              <Link to="/dashboard/pipeline" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                View pipeline
                <Icon name="arrow-left" size={16} style={{ transform: 'rotate(180deg)' }} />
              </Link>
            }
          >
            <HiringFunnel stages={hiringFunnel} />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Recruitment health" subtitle="Key efficiency signals">
            <Flex vertical gap={20}>
              {healthMetrics.map((metric) => (
                <Flex align="center" gap={16} key={metric.label}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 12,
                      background: `${metric.tone}1a`,
                      color: metric.tone,
                    }}
                  >
                    <Icon name={metric.icon} size={20} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                      {metric.label}
                    </Typography.Text>
                    <Typography.Text strong style={{ display: 'block', fontSize: 18 }}>
                      {metric.value}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {metric.hint}
                    </Typography.Text>
                  </div>
                </Flex>
              ))}
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Interviews + activity */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Upcoming interviews" subtitle="Next on the schedule" bodyClassName="tp-flush-list">
            <List
              dataSource={upcomingInterviews}
              renderItem={(interview) => {
                const type = INTERVIEW_TYPE_BADGE[interview.type];
                return (
                  <List.Item key={interview.id}>
                    <Flex wrap align="center" gap={16} style={{ width: '100%' }}>
                      <div className="tp-interview-when">
                        <Typography.Text strong style={{ display: 'block' }}>
                          {interview.dayLabel}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {interview.time}
                        </Typography.Text>
                      </div>
                      <Avatar firstName={interview.candidateName} size="sm" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Typography.Text strong ellipsis style={{ display: 'block' }}>
                          {interview.candidateName}
                        </Typography.Text>
                        <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                          {interview.jobTitle} · with {interview.interviewerName}
                        </Typography.Text>
                      </div>
                      <Badge tone={type.tone}>
                        {interview.type === 'VIDEO' && <Icon name="video-camera" size={14} />}
                        {interview.type === 'ONSITE' && <Icon name="building" size={14} />}
                        {interview.type === 'PHONE' && <Icon name="clock" size={14} />}
                        {type.label}
                      </Badge>
                    </Flex>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Recent activity" subtitle="Latest workspace events">
            {/* A Timeline rather than a list: these are events in order, and the
                connecting rail is what says so. */}
            <Timeline
              items={activityFeed.map((item) => ({
                key: item.id,
                dot: (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: `${ACTIVITY_TONES[item.icon]}1a`,
                      color: ACTIVITY_TONES[item.icon],
                    }}
                  >
                    <Icon name={item.icon as IconName} size={16} />
                  </span>
                ),
                children: (
                  <>
                    <Typography.Text style={{ display: 'block' }}>{item.text}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.time}
                    </Typography.Text>
                  </>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* Mounted only while open, so each invite starts from a clean form. */}
      {allow('team.invite') && inviteOpen && (
        <InviteMemberModal
          open
          onClose={() => {
            setInviteOpen(false);
            setInviteError(null);
          }}
          onInvite={(values) => void handleInvite(values)}
          submitting={inviteSubmitting}
          error={inviteError?.message ?? null}
          errorTone={inviteError?.tone ?? 'error'}
          focusField={inviteError?.focus ?? null}
        />
      )}
    </>
  );
}

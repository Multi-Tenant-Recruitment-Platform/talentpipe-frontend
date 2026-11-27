import {
  ArrowRightOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  MailOutlined,
  SolutionOutlined,
  StarOutlined,
  TeamOutlined,
  UserAddOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Col, Flex, List, Row, Timeline, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobsApi } from '../../api/jobs';
import { teamApi } from '../../api/team';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Avatar } from '../../components/dashboard/Avatar';
import { Badge } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { HiringFunnel } from '../../components/dashboard/HiringFunnel';
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
  type ActivityItem,
} from '../../data/mockDashboard';
import type { IconComponent } from '../../components/ui/icon';

/** The feed's event kinds arrive as data; which glyph draws each is a UI call. */
const ACTIVITY_ICON: Record<ActivityItem['icon'], IconComponent> = {
  'user-plus': UserAddOutlined,
  briefcase: SolutionOutlined,
  calendar: CalendarOutlined,
  check: CheckOutlined,
  envelope: MailOutlined,
};

function ActivityGlyph({ kind }: Readonly<{ kind: ActivityItem['icon'] }>) {
  const Glyph = ACTIVITY_ICON[kind];
  return <Glyph aria-hidden className="text-[16px]" />;
}

/** Each type already carries its own icon and word; colour would be a third
    encoding of the same fact, in three hues the palette does not have. */
const INTERVIEW_TYPE_BADGE: Record<string, { label: string }> = {
  VIDEO: { label: 'Video' },
  ONSITE: { label: 'On-site' },
  PHONE: { label: 'Phone' },
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * The workspace overview: headline KPIs, the hiring funnel, recruitment
 * health, upcoming interviews and the latest activity.
 *
 * <p>Every member lands here, so each section shows only to a member whose
 * role reaches what it is about. The funnel, the schedule and the feed are
 * company-wide; a member who works on a few vacancies gets their own vacancy
 * count and a pointer to them, not the whole company's hiring.</p>
 */
export function OverviewPage() {
  const { user } = useAuth();
  const allow = useCan();
  const navigate = useNavigate();
  const { pendingInvites, loading: teamLoading, refresh: refreshTeam } = useTeamSummary();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<TeamErrorPlan | null>(null);
  const [activeJobs, setActiveJobs] = useState<number | null>(null);
  // GET /jobs/counts counts the vacancies the member works on, or every one
  // with jobs.view.all, so it is safe for anyone who may list vacancies.
  const canSeeJobs = allow('jobs.view');
  const seesAllJobs = allow('jobs.viewAll');
  const canSeePipeline = allow('pipeline.view');
  const canSeeInterviews = allow('interviews.viewAll');
  const canSeeTeam = allow('team.view');
  // The feed mixes team events (invites, joins) with hiring ones (offers,
  // hires), so it needs both.
  const canSeeActivity = canSeeTeam && canSeePipeline;
  const kpis = [canSeeJobs, canSeePipeline, canSeeInterviews, canSeeTeam].filter(Boolean).length;
  const kpiXs = kpis > 1 ? 12 : 24;
  const kpiXl = kpis > 0 ? 24 / kpis : 24;

  useEffect(() => {
    if (!canSeeJobs) {
      return;
    }
    let live = true;
    jobsApi
      .counts()
      .then((counts) => live && setActiveJobs(counts.PUBLISHED ?? 0))
      // A failed count leaves the tile at "—"; the rest of the overview still works.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [canSeeJobs]);

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

  const healthMetrics: { icon: IconComponent; label: string; value: string; hint: string }[] = [
    {
      icon: ClockCircleOutlined,
      label: 'Avg. time-to-hire',
      value: `${recruitmentHealth.avgTimeToHireDays} days`,
      hint: '2 days faster than last quarter',
    },
    {
      icon: CheckOutlined,
      label: 'Offer acceptance',
      value: `${recruitmentHealth.offerAcceptanceRate}%`,
      hint: '11 of 13 offers accepted',
    },
    {
      icon: StarOutlined,
      label: 'Hired this month',
      value: String(recruitmentHealth.hiredThisMonth),
      hint: 'Across 3 departments',
    },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.firstName ?? 'there'}`}
        subtitle={`Here's what's happening with your hiring — ${today}`}
      >
        {allow('jobs.manage') && (
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard/jobs/new')}
            icon={<SolutionOutlined aria-hidden className="text-[16px]" />}
          >
            Post a job
          </Button>
        )}
        {/* Without team.invite the API would only answer 403, so the button
            is not offered. */}
        {allow('team.invite') && (
          <Button
            variant="primary"
            onClick={() => setInviteOpen(true)}
            icon={<UserAddOutlined aria-hidden className="text-[16px]" />}
          >
            Invite member
          </Button>
        )}
      </PageHeader>

      {notice && (
        <Alert tone="info" onDismiss={() => setNotice(null)} className="mb-6">
          {notice}
        </Alert>
      )}

      {error && (
        <Alert tone="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* KPI row: one tile per thing the member's role can see. */}
      <Row gutter={[20, 20]}>
        {/* Published vacancies, from GET /jobs/counts. No trend delta: the API
            keeps no history to compare against. */}
        {canSeeJobs && (
          <Col xs={kpiXs} xl={kpiXl}>
            <StatCard
              label={seesAllJobs ? 'Active jobs' : 'Your active jobs'}
              value={activeJobs === null ? '—' : String(activeJobs)}
              icon={SolutionOutlined}
            />
          </Col>
        )}
        {canSeePipeline && (
          <Col xs={kpiXs} xl={kpiXl}>
            <StatCard
              label="Candidates in pipeline"
              value={overviewStats.candidatesInPipeline.toLocaleString()}
              icon={TeamOutlined}
              delta={{ value: '+18%', direction: 'up', hint: 'vs last week' }}
            />
          </Col>
        )}
        {canSeeInterviews && (
          <Col xs={kpiXs} xl={kpiXl}>
            <StatCard
              label="Interviews this week"
              value={String(overviewStats.interviewsThisWeek)}
              icon={CalendarOutlined}
              delta={{ value: '+4', direction: 'up', hint: 'vs last week' }}
            />
          </Col>
        )}
        {/* From GET /team, which needs team.view. */}
        {canSeeTeam && (
          <Col xs={kpiXs} xl={kpiXl}>
            <StatCard
              label="Pending invites"
              value={teamLoading ? '—' : String(pendingInvites.length)}
              icon={MailOutlined}
            />
          </Col>
        )}
      </Row>

      {/* A member who sees only their own vacancies would otherwise get a
          near-empty page with no hint of where their work is. */}
      {!canSeePipeline && !canSeeInterviews && !canSeeActivity && (
        <Row gutter={[24, 24]} className="mt-6">
          <Col xs={24}>
            <Card title="Your work here" subtitle="What your role covers in this workspace">
              <Typography.Paragraph className="mb-0">
                Your role works on particular vacancies rather than the whole company&rsquo;s hiring, so
                there&rsquo;s no company-wide funnel or schedule here.
                {canSeeJobs && (
                  <>
                    {' '}
                    Open <Link to="/dashboard/jobs">Job Vacancies</Link> to see the ones you&rsquo;re on.
                  </>
                )}
              </Typography.Paragraph>
            </Card>
          </Col>
        </Row>
      )}

      {/* Funnel + health: every applicant's progress, so pipeline.view. */}
      {canSeePipeline && (
        <Row gutter={[24, 24]} className="mt-6">
          <Col xs={24} lg={16}>
            <Card
              title="Hiring funnel"
              subtitle="All open jobs · last 90 days"
              action={
                <Link to="/dashboard/pipeline" className="inline-flex items-center gap-1 font-semibold">
                  View pipeline
                  <ArrowRightOutlined aria-hidden className="text-[16px]" />
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
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <metric.icon aria-hidden className="text-[20px]" />
                    </span>
                    <div className="min-w-0">
                      <Typography.Text type="secondary" className="block text-caption">
                        {metric.label}
                      </Typography.Text>
                      <Typography.Text strong className="block text-title">
                        {metric.value}
                      </Typography.Text>
                      <Typography.Text type="secondary" className="text-caption">
                        {metric.hint}
                      </Typography.Text>
                    </div>
                  </Flex>
                ))}
              </Flex>
            </Card>
          </Col>
        </Row>
      )}

      {/* Interviews + activity */}
      {(canSeeInterviews || canSeeActivity) && (
        <Row gutter={[24, 24]} className="mt-6">
          {canSeeInterviews && (
            <Col xs={24} lg={canSeeActivity ? 16 : 24}>
              {/* A List that sits flush inside a Card, with its own inner padding. */}
              <Card title="Upcoming interviews" subtitle="Next on the schedule" bodyClassName="tp-flush-list p-0">
                <List
                  dataSource={upcomingInterviews}
                  renderItem={(interview) => {
                    const type = INTERVIEW_TYPE_BADGE[interview.type];
                    return (
                      <List.Item key={interview.id}>
                        <Flex wrap align="center" gap={16} className="w-full">
                          {/* The date/time column on an upcoming-interview row. */}
                          <div className="w-24 shrink-0 border-l-2 border-primary-500 pl-3">
                            <Typography.Text strong className="block">
                              {interview.dayLabel}
                            </Typography.Text>
                            <Typography.Text type="secondary" className="text-caption">
                              {interview.time}
                            </Typography.Text>
                          </div>
                          <Avatar firstName={interview.candidateName} size="sm" />
                          <div className="min-w-0 flex-1">
                            <Typography.Text strong ellipsis className="block">
                              {interview.candidateName}
                            </Typography.Text>
                            <Typography.Text type="secondary" ellipsis className="text-caption">
                              {interview.jobTitle} · with {interview.interviewerName}
                            </Typography.Text>
                          </div>
                          <Badge>
                            {interview.type === 'VIDEO' && <VideoCameraOutlined aria-hidden className="text-[14px]" />}
                            {interview.type === 'ONSITE' && <BankOutlined aria-hidden className="text-[14px]" />}
                            {interview.type === 'PHONE' && <ClockCircleOutlined aria-hidden className="text-[14px]" />}
                            {type.label}
                          </Badge>
                        </Flex>
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Col>
          )}

          {canSeeActivity && (
            <Col xs={24} lg={canSeeInterviews ? 8 : 24}>
              <Card title="Recent activity" subtitle="Latest workspace events">
                {/* A Timeline rather than a list: these are events in order, and the
                    connecting rail is what says so. */}
                <Timeline
                  items={activityFeed.map((item) => ({
                    key: item.id,
                    dot: (
                      // Neutral by design: a feed of five hues turns a
                      // chronology into a colour key nobody is given. The icon
                      // already says what kind of event this was.
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                        <ActivityGlyph kind={item.icon} />
                      </span>
                    ),
                    children: (
                      <>
                        <Typography.Text className="block">{item.text}</Typography.Text>
                        <Typography.Text type="secondary" className="text-caption">
                          {item.time}
                        </Typography.Text>
                      </>
                    ),
                  }))}
                />
              </Card>
            </Col>
          )}
        </Row>
      )}

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

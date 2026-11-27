import {
  ArrowRightOutlined,
  EnvironmentOutlined,
  EyeInvisibleOutlined,
  LeftOutlined,
  MailOutlined,
  PhoneOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Descriptions, Drawer, Grid, Progress, Skeleton, Steps, Tabs, Typography } from 'antd';
import axios from 'axios';
import { useState } from 'react';
import { applicantsApi } from '../../api/applicants';
import { apiErrorMessage } from '../../api/client';
import type { ApplicantReview, ApplicantRow } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { pipelineSteps, scorePlaceholder, scoreTone, type Tone } from '../../dashboard/applicants';
import { useApplicantReview } from '../../dashboard/useApplicantReview';
import { slate, status as statusColor } from '../../theme/tokens';
import { formatDate } from '../../utils/format';
import { Avatar } from '../dashboard/Avatar';
import { EmptyState } from '../dashboard/EmptyState';
import { ErrorState } from '../dashboard/ErrorState';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ApplicantCvPreview } from './ApplicantCvPreview';
import { ApplicantCvSummary } from './ApplicantCvSummary';
import { ApplicantEvaluation } from './ApplicantEvaluation';
import { ApplicantHistory } from './ApplicantHistory';
import { ReviewStatusTag } from './ApplicantsTable';

const RING: Record<Tone, string> = {
  success: statusColor.success,
  warning: statusColor.warning,
  error: statusColor.error,
  highlight: statusColor.highlightText,
  neutral: slate[400],
};

/**
 * One applicant's application, in a panel over the list: who they are, where
 * they are in the vacancy's pipeline, and — in tabs — why they scored as they
 * did, their CV, and everything that has happened so far.
 *
 * <p>Opened by its own address, so a refresh or a shared link reopens it, and
 * Back closes it. Previous and Next walk the list as it is shown, filters and
 * order included, so a recruiter can review a band without closing the
 * panel.</p>
 */
export function ApplicantReviewDrawer({
  applicationId,
  rows,
  onNavigate,
  onClose,
  onChanged,
}: Readonly<{
  applicationId: string;
  /** The list as shown, for Previous and Next. */
  rows: ApplicantRow[];
  onNavigate: (applicationId: string) => void;
  onClose: () => void;
  /** After a decision: the list behind the panel reloads to match. */
  onChanged?: () => void;
}>) {
  const { state, retry, replace } = useApplicantReview(applicationId);
  const allow = useCan();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Cleared when moving to another applicant, so a notice never sits on the wrong person.
  const [notice, setNotice] = useState<{ for: string; text: string } | null>(null);

  const review = state.status === 'ready' ? state.review : null;
  // Only a person deciding on a manual-review applicant sends them on: auto-advanced
  // applicants are at interview already, and rejected ones stay rejected.
  const canSend = !!review && review.application.reviewStatus === 'MANUAL_REVIEW' && allow('pipeline.manage');

  async function sendToInterview() {
    if (!review) return;
    setSending(true);
    setSendError(null);
    try {
      const updated = await applicantsApi.advanceToInterview(review.application.id, review.application.version);
      replace(updated);
      setConfirming(false);
      setNotice({ for: updated.application.id, text: `${updated.candidate.name} was sent to the interview stage.` });
      onChanged?.();
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 409) {
        // Someone else decided first: show what is true now rather than retry blindly.
        setConfirming(false);
        setNotice({
          for: review.application.id,
          text: 'Someone else updated this applicant after you opened it. The latest version is now showing.',
        });
        retry();
        onChanged?.();
      } else if (status === 403) {
        setSendError('Your role no longer allows moving applicants. Sign out and back in if you think this is wrong.');
      } else {
        setSendError(apiErrorMessage(err, "We couldn't send this applicant to interview. Try again in a moment."));
      }
    } finally {
      setSending(false);
    }
  }
  const screens = Grid.useBreakpoint();
  const index = rows.findIndex((row) => row.applicationId === applicationId);
  const previous = index > 0 ? rows[index - 1] : null;
  const next = index >= 0 && index < rows.length - 1 ? rows[index + 1] : null;

  const title = state.status === 'ready' ? state.review.candidate.name : 'Applicant';

  return (
    <Drawer
      open
      placement="right"
      size={screens.md ? 760 : '100%'}
      onClose={onClose}
      title={<span className="sr-only">{title}</span>}
      closable={{ 'aria-label': 'Close' }}
      extra={
        <span className="flex items-center gap-2">
          {canSend && (
            <Button
              variant="primary"
              onClick={() => {
                setSendError(null);
                setConfirming(true);
              }}
            >
              Send to interview
              <ArrowRightOutlined aria-hidden />
            </Button>
          )}
          <span className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous applicant"
            disabled={!previous}
            onClick={() => previous && onNavigate(previous.applicationId)}
          >
            <LeftOutlined aria-hidden />
          </Button>
          {index >= 0 && (
            <span className="text-caption tabular-nums text-slate-500">
              {index + 1} of {rows.length}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next applicant"
            disabled={!next}
            onClick={() => next && onNavigate(next.applicationId)}
          >
            <RightOutlined aria-hidden />
          </Button>
          </span>
        </span>
      }
    >
      {notice && notice.for === applicationId && (
        <Alert tone="success" className="mb-5">
          {notice.text}
        </Alert>
      )}
      {state.status === 'loading' && (
        <div className="flex flex-col gap-6">
          <Skeleton avatar active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 6 }} />
          <span className="sr-only">Loading the application…</span>
        </div>
      )}
      {state.status === 'error' &&
        (state.notFound ? (
          <EmptyState
            icon={EyeInvisibleOutlined}
            title="This application isn't available"
            description={state.message}
            action={
              <Button variant="secondary" onClick={onClose}>
                Back to the list
              </Button>
            }
          />
        ) : (
          <ErrorState title="We couldn't load this application" description={state.message} onRetry={retry} />
        ))}
      {state.status === 'ready' && <ReviewBody review={state.review} />}

      {review && (
        <ConfirmDialog
          open={confirming}
          title="Send to the interview stage?"
          description={
            <>
              <strong>{review.candidate.name}</strong> moves out of manual review and on to interview. The
              candidate will see their application as shortlisted.
            </>
          }
          confirmLabel="Send to interview"
          busyLabel="Sending…"
          tone="primary"
          busy={sending}
          error={sendError}
          onConfirm={() => void sendToInterview()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Drawer>
  );
}

function ReviewBody({ review }: Readonly<{ review: ApplicantReview }>) {
  const { candidate, application, score } = review;
  const steps = pipelineSteps(review);
  const currentStage = review.stages.find((stage) => stage.id === review.currentStageId)?.name;
  const blind = application.vacancy.blindMode;
  const overall = score?.overallScore ?? null;

  const contact = [
    { icon: MailOutlined, value: candidate.email, href: candidate.email ? `mailto:${candidate.email}` : undefined },
    { icon: PhoneOutlined, value: candidate.phone, href: candidate.phone ? `tel:${candidate.phone}` : undefined },
    { icon: EnvironmentOutlined, value: candidate.location, href: undefined },
  ].filter((item) => item.value);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <Avatar firstName={candidate.name} size="lg" />
        <div className="min-w-0 flex-1">
          <Typography.Title level={2} className="m-0 text-section text-slate-900">
            {candidate.name}
          </Typography.Title>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <ReviewStatusTag status={application.reviewStatus} />
            <span className="text-caption text-slate-500">Applied {formatDate(application.appliedAt)}</span>
          </div>
          {blind ? (
            <p className="m-0 mt-2 flex items-center gap-1.5 text-small text-slate-500">
              <EyeInvisibleOutlined aria-hidden />
              Blind mode is on: who the candidate is stays hidden.
            </p>
          ) : (
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-small text-slate-600">
              {contact.map(({ icon: Icon, value, href }) => (
                <li key={value} className="flex min-w-0 items-center gap-1.5">
                  <Icon aria-hidden className="text-slate-400" />
                  {href ? (
                    <a href={href} className="truncate text-slate-600 hover:text-primary-700">
                      {value}
                    </a>
                  ) : (
                    <span className="truncate">{value}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          {overall === null ? (
            <span className="flex size-[76px] items-center justify-center rounded-full bg-slate-100 text-center text-caption text-slate-500">
              {scorePlaceholder({
                scoreStatus: score?.status === 'SCORING_FAILED' ? 'SCORING_FAILED' : 'PENDING',
                reviewStatus: application.reviewStatus,
              })}
            </span>
          ) : (
            <Progress
              type="circle"
              size={76}
              percent={overall}
              strokeColor={RING[scoreTone(overall, review.thresholds)]}
              format={() => (
                <span className="text-lead font-semibold tabular-nums text-slate-900">{overall}</span>
              )}
              aria-label={`AI score ${overall} out of 100`}
            />
          )}
          <span className="text-caption text-slate-500">AI score</span>
        </div>
      </header>

      <section aria-label="Recruitment stage" className="rounded-xl border border-slate-200 p-4">
        <Steps
          size="small"
          current={steps.current}
          status={steps.status}
          items={steps.titles.map((title) => ({ title }))}
        />
      </section>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <div className="flex flex-col gap-6">
                <Descriptions
                  size="small"
                  column={{ xs: 1, sm: 2 }}
                  items={[
                    { key: 'vacancy', label: 'Vacancy', children: application.vacancy.title },
                    { key: 'applied', label: 'Applied', children: formatDate(application.appliedAt) },
                    { key: 'stage', label: 'Current stage', children: currentStage ?? steps.titles[steps.current] },
                    {
                      key: 'decided',
                      label: 'Last decision',
                      children: application.decidedAt ? formatDate(application.decidedAt) : 'None yet',
                    },
                  ]}
                />
                <ApplicantCvSummary score={review.score} />
                <ApplicantEvaluation review={review} />
              </div>
            ),
          },
          {
            key: 'cv',
            label: 'CV',
            children: (
              <ApplicantCvPreview applicationId={application.id} candidateName={candidate.name} cv={review.cv} />
            ),
          },
          {
            key: 'history',
            label: `History (${review.history.length})`,
            children: <ApplicantHistory history={review.history} />,
          },
        ]}
      />
    </div>
  );
}

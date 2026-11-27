import { ExperimentOutlined, FileSearchOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { ApplicantReview } from '../../api/types';
import { isDemoScore } from '../../dashboard/applicants';
import { formatRelativeTime } from '../../utils/format';

/**
 * The AI model's own summary of the candidate's CV — the paragraph the
 * screening service writes for the recruiter (`summary` in its response,
 * 10 to 1,200 characters, produced by the AI service's LLM). Shown first, so
 * the recruiter reads who the candidate is before how they scored.
 *
 * <p>Nothing here is generated in the browser: until the application has
 * been screened, the section says so instead of inventing a summary.</p>
 */
export function ApplicantCvSummary({ score }: Readonly<{ score: ApplicantReview['score'] }>) {
  const summary = score?.summary?.trim();
  const demo = isDemoScore(score?.modelVersion);

  return (
    <section aria-labelledby="applicant-cv-summary-heading" className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Typography.Title
          level={4}
          id="applicant-cv-summary-heading"
          className="m-0 flex items-center gap-2 text-lead"
        >
          <FileSearchOutlined aria-hidden className="text-primary-600" />
          CV summary
        </Typography.Title>
        {summary && demo && (
          <Tag icon={<ExperimentOutlined aria-hidden />} className="m-0">
            Demo — not written by the AI
          </Tag>
        )}
      </div>
      {summary ? (
        <>
          <p className="m-0 whitespace-pre-line text-body text-slate-700">{summary}</p>
          {!demo && score?.scoredAt && (
            <p className="m-0 mt-2 text-caption text-slate-500">
              Written by the AI model{score.modelVersion ? ` (${score.modelVersion})` : ''}{' '}
              {formatRelativeTime(score.scoredAt)}.
            </p>
          )}
        </>
      ) : (
        <p className="m-0 text-small text-slate-500">
          {score?.status === 'SCORING_FAILED'
            ? "The AI couldn't read this CV, so there is no summary."
            : 'The AI hasn’t summarised this CV yet. It appears here once the application is screened.'}
        </p>
      )}
    </section>
  );
}

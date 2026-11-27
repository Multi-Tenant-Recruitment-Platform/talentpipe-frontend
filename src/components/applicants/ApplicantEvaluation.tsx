import { CheckCircleFilled, CloseCircleFilled, ExperimentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Progress, Tag, Typography } from 'antd';
import type { ApplicantReview } from '../../api/types';
import { TONE_CLASS, isDemoScore, scoreTone, verdictSentence, type Tone } from '../../dashboard/applicants';
import { status as statusColor, slate } from '../../theme/tokens';

/** The bar colour for a tone; neutral bars stay slate. */
const BAR: Record<Tone, string> = {
  success: statusColor.success,
  warning: statusColor.warning,
  error: statusColor.error,
  highlight: statusColor.highlightText,
  neutral: slate[400],
};

/**
 * Why the application is where it is: the rule that placed it, each
 * criterion's score with its weight, and the skills the CV shows and lacks.
 * (The AI's summary of the CV is its own section, above this one.)
 *
 * <p>The rule-based sentence comes first and is always there; the AI's words
 * follow it. A score from the local stand-in scorer is labelled as such, so a
 * demo number is never mistaken for an assessment.</p>
 */
export function ApplicantEvaluation({ review }: Readonly<{ review: ApplicantReview }>) {
  const { score, thresholds } = review;

  return (
    <section aria-labelledby="applicant-evaluation-heading" className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Typography.Title level={4} id="applicant-evaluation-heading" className="m-0 text-lead">
          AI evaluation
        </Typography.Title>
        {isDemoScore(score?.modelVersion) && (
          <Tag icon={<ExperimentOutlined aria-hidden />} className="m-0">
            Demo score — not an AI assessment
          </Tag>
        )}
      </div>

      <p className="m-0 flex gap-2 rounded-xl bg-slate-50 p-4 text-small text-slate-700">
        <InfoCircleOutlined aria-hidden className="mt-0.5 shrink-0 text-primary-600" />
        <span>{verdictSentence(review)}</span>
      </p>

      {score && score.criteria.length > 0 && (
        <div>
          <h5 className="m-0 mb-3 text-small font-semibold text-slate-800">Score by criterion</h5>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {score.criteria.map((criterion) => {
              const tone = scoreTone(criterion.score, thresholds);
              return (
                <li key={criterion.name}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-800">{criterion.name}</span>
                    {criterion.mustHave !== null && (
                      <span
                        className={`rounded-pill px-2 py-px text-caption ${criterion.mustHave ? TONE_CLASS.highlight : TONE_CLASS.neutral}`}
                      >
                        {criterion.mustHave ? 'Must-have' : 'Preferred'}
                      </span>
                    )}
                    {criterion.weight !== null && (
                      <span className="text-caption text-slate-500">
                        weighs {Math.round(criterion.weight * 100)}%
                      </span>
                    )}
                    <span className="ml-auto text-small font-semibold tabular-nums text-slate-800">
                      {criterion.score}
                    </span>
                  </div>
                  <Progress
                    percent={criterion.score}
                    showInfo={false}
                    strokeColor={BAR[tone]}
                    size="small"
                    aria-label={`${criterion.name}: ${criterion.score} out of 100`}
                  />
                  {criterion.rationale && (
                    <p className="m-0 text-caption text-slate-500">{criterion.rationale}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {score && (score.matchedSkills.length > 0 || score.missingSkills.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkillList title="Matched skills" skills={score.matchedSkills} tone="success" />
          <SkillList title="Missing skills" skills={score.missingSkills} tone="error" />
        </div>
      )}

      {score && (score.strengths.length > 0 || score.gaps.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PointList title="Strengths" points={score.strengths} good />
          <PointList title="Gaps" points={score.gaps} good={false} />
        </div>
      )}

      <p className="m-0 text-caption text-slate-500">
        This is an AI suggestion to help you prioritise. The decision is always the recruiter's.
      </p>
    </section>
  );
}

function SkillList({ title, skills, tone }: Readonly<{ title: string; skills: string[]; tone: 'success' | 'error' }>) {
  return (
    <div>
      <h5 className="m-0 mb-2 text-small font-semibold text-slate-800">{title}</h5>
      {skills.length === 0 ? (
        <p className="m-0 text-caption text-slate-500">None</p>
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {skills.map((skill) => (
            <li key={skill} className={`rounded-pill px-2.5 py-0.5 text-caption font-medium ${TONE_CLASS[tone]}`}>
              {skill}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PointList({ title, points, good }: Readonly<{ title: string; points: string[]; good: boolean }>) {
  const Icon = good ? CheckCircleFilled : CloseCircleFilled;
  return (
    <div>
      <h5 className="m-0 mb-2 text-small font-semibold text-slate-800">{title}</h5>
      {points.length === 0 ? (
        <p className="m-0 text-caption text-slate-500">None noted</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {points.map((point) => (
            <li key={point} className="flex gap-2 text-small text-slate-700">
              <Icon aria-hidden className={`mt-0.5 shrink-0 ${good ? 'text-success' : 'text-error'}`} />
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

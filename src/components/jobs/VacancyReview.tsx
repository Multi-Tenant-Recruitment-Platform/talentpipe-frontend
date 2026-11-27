import { CheckCircleFilled, EditOutlined } from '@ant-design/icons';
import { Flex, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { benefitLabel } from '../../dashboard/companyProfile';
import { CATEGORY_LABELS, REQUIREMENT_LABELS } from '../../dashboard/idealMatching';
import {
  createsVacancy,
  employmentTypeLabel,
  formatWorkingDays,
  joinLabels,
  payPeriodLabel,
  runsOnPipeline,
  sectionProblems,
  sectionProgress,
  shiftTypeLabel,
  VACANCY_SECTIONS,
  workplaceTypeLabel,
  FIELD_LABELS,
  type JobVacancyField,
  type JobVacancyFieldErrors,
  type JobVacancyFormValues,
  type VacancyFormMode,
} from '../../dashboard/jobVacancy';
import { space } from '../../theme/tokens';
import { currencyCode, formatCalendarDate } from '../../utils/format';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { detailGrid } from '../ui/classes';

/**
 * The last step: the whole vacancy read back before it goes out.
 *
 * <p>Read from the form's own values, not from a saved record, so what is
 * checked here is exactly what Publish sends — including the work since the
 * last auto-save. Each section can be reopened from its own Edit button,
 * which is the shortest way from "that's wrong" to fixing it.</p>
 *
 * <p>Blank optional answers are left out, as on the vacancy's page. An
 * optional section with nothing in it says so in one line rather than
 * disappearing, so a missing salary band is a decision someone saw, not one
 * they skipped past.</p>
 */

function Fact({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  return (
    <div className="min-w-0">
      <dt className="text-caption font-medium uppercase tracking-[0.03em] text-slate-500">{label}</dt>
      <dd className="m-0 mt-0.5 min-w-0 break-words">
        <Typography.Text>{value}</Typography.Text>
      </dd>
    </div>
  );
}

function Chips({ label, values }: Readonly<{ label: string; values: string[] }>) {
  const shown = values.filter((value) => value.trim() !== '');
  if (shown.length === 0) {
    return null;
  }
  return (
    <div className="min-w-0 sm:col-span-2">
      <dt className="mb-1.5 text-caption font-medium uppercase tracking-[0.03em] text-slate-500">{label}</dt>
      <dd className="m-0">
        <Flex gap={space[0.5]} wrap>
          {shown.map((value) => (
            <Tag key={value} className="m-0">
              {value}
            </Tag>
          ))}
        </Flex>
      </dd>
    </div>
  );
}

function Lines({ label, values }: Readonly<{ label: string; values: string[] }>) {
  const shown = values.filter((value) => value.trim() !== '');
  if (shown.length === 0) {
    return null;
  }
  return (
    <div className="min-w-0 sm:col-span-2">
      <dt className="mb-1 text-caption font-medium uppercase tracking-[0.03em] text-slate-500">{label}</dt>
      <dd className="m-0">
        <ul className="m-0 ps-5">
          {shown.map((value) => (
            <li key={value} className="mb-0.5">
              <Typography.Text>{value}</Typography.Text>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function Prose({ label, value }: Readonly<{ label: string; value: string }>) {
  if (value.trim() === '') {
    return null;
  }
  return (
    <div className="min-w-0 sm:col-span-2">
      <dt className="mb-1 text-caption font-medium uppercase tracking-[0.03em] text-slate-500">{label}</dt>
      <dd className="m-0 whitespace-pre-wrap break-words">
        <Typography.Text>{value}</Typography.Text>
      </dd>
    </div>
  );
}

function salaryOf(values: JobVacancyFormValues): string {
  const { salaryMin: min, salaryMax: max } = values;
  if (min === null && max === null) {
    return '';
  }
  const code = values.currency ? `${currencyCode(values.currency)} ` : '';
  const amount = (value: number) => value.toLocaleString();
  if (min !== null && max !== null) {
    return `${code}${amount(min)} – ${amount(max)}`;
  }
  return min !== null ? `From ${code}${amount(min)}` : `Up to ${code}${amount(max as number)}`;
}

function Body({ sectionId, values }: Readonly<{ sectionId: string; values: JobVacancyFormValues }>) {
  switch (sectionId) {
    case 'basics':
      return (
        <>
          <Fact label="Job title" value={values.title.trim()} />
          <Fact label="Department" value={values.department} />
          <Fact label="Industry" value={values.industry} />
          <Fact label="Openings" value={values.openings === null ? '' : String(values.openings)} />
          <Fact label="Employment type" value={employmentTypeLabel(values.employmentType || null) ?? ''} />
          <Fact label="Workplace" value={workplaceTypeLabel(values.workplaceType || null) ?? ''} />
          <Fact label="Location" value={values.location.trim()} />
          <Fact
            label="Applications close"
            value={values.applicationDeadline ? formatCalendarDate(values.applicationDeadline) : ''}
          />
        </>
      );
    case 'description':
      return (
        <>
          <Prose label="Summary" value={values.jobSummary} />
          <Prose label="Description" value={values.jobDescription} />
          <Lines label="Key responsibilities" values={values.keyResponsibilities} />
        </>
      );
    case 'requirements':
      return (
        <>
          <Chips label="Required skills" values={values.requiredSkills} />
          <Chips label="Preferred skills" values={values.preferredSkills} />
          <Chips label="Tools & technologies" values={values.toolsAndTechnologies} />
          <Fact
            label="Minimum experience"
            value={values.minimumExperienceYears === null ? '' : `${values.minimumExperienceYears} years`}
          />
          <Fact label="Education" value={values.education} />
          <Fact label="Certifications" value={values.certifications.filter(Boolean).join(', ')} />
          <Fact label="Languages" value={values.languageRequirements.filter(Boolean).join(', ')} />
          <Prose label="Other requirements" value={values.otherRequirements} />
        </>
      );
    case 'salary':
      return (
        <>
          <Fact label="Salary" value={salaryOf(values)} />
          <Fact label="Pay period" value={payPeriodLabel(values.payPeriod || null) ?? ''} />
          <Chips label="Benefits" values={values.benefits.map(benefitLabel)} />
        </>
      );
    case 'schedule':
      return (
        <>
          <Fact label="Working days" value={formatWorkingDays(values.workingDays)} />
          <Fact label="Working hours" value={values.workingHours.trim()} />
          <Fact label="Shift" value={shiftTypeLabel(values.shiftType || null) ?? ''} />
          <Fact
            label="Hours per week"
            value={values.expectedHoursPerWeek === null ? '' : String(values.expectedHoursPerWeek)}
          />
        </>
      );
    case 'pipeline':
      return <PipelineFacts values={values} />;
    case 'matching':
      return <MatchingFacts values={values} />;
    default:
      return null;
  }
}

function PipelineFacts({ values }: Readonly<{ values: JobVacancyFormValues }>) {
  if (!runsOnPipeline(values)) {
    return <Fact label="Pipeline" value="Created before pipeline templates — no screening settings" />;
  }
  const panels = (values.interviewPanels ?? []).filter((panel) => panel.interviewers.length > 0);
  return (
    <>
      <Fact label="Pipeline template" value={values.pipelineTemplateName || 'Chosen template'} />
      <Fact label="Blind screening" value={values.blindModeEnabled ? 'On' : 'Off'} />
      <Fact label="Auto-advance threshold" value={values.autoThreshold === null ? '' : String(values.autoThreshold)} />
      <Fact
        label="Manual-review threshold"
        value={values.manualThreshold === null ? '' : String(values.manualThreshold)}
      />
      {panels.length > 0 && (
        <Lines
          label="Interview panels"
          values={panels.map(
            (panel) =>
              `${panel.stageName}: ${panel.interviewers.map((person) => `${person.firstName} ${person.lastName}`.trim()).join(', ')}`,
          )}
        />
      )}
    </>
  );
}

function MatchingFacts({ values }: Readonly<{ values: JobVacancyFormValues }>) {
  const matching = values.idealMatching;
  if (!values.idealMatchingAvailable) {
    return <Fact label="Ideal candidate matching" value="Not offered by this pipeline template" />;
  }
  if (!matching?.enabled) {
    return <Fact label="Ideal candidate matching" value="Off" />;
  }
  const weighted = matching.items.filter((item) => item.weight !== null && item.name.trim() !== '');
  return (
    <>
      <Fact label="Ideal candidate matching" value="On" />
      {weighted.length > 0 && (
        <div className="min-w-0 sm:col-span-2">
          <dt className="mb-1.5 text-caption font-medium uppercase tracking-[0.03em] text-slate-500">Weights</dt>
          <dd className="m-0">
            <ul className="m-0 grid list-none gap-1 p-0">
              {weighted.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1 last:border-0">
                  <span className="min-w-0 truncate">
                    <Typography.Text>{item.name}</Typography.Text>{' '}
                    <Typography.Text type="secondary" className="text-caption">
                      {CATEGORY_LABELS[item.category]}
                      {item.requirement ? ` · ${REQUIREMENT_LABELS[item.requirement]}` : ''}
                    </Typography.Text>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{item.weight}%</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      <Chips label="Accepted degree types" values={matching.degreeTypes} />
      <Chips label="Nice-to-have certifications" values={matching.niceToHaveCertifications} />
    </>
  );
}

export function VacancyReview({
  values,
  mode,
  problems,
  live,
  onEdit,
}: Readonly<{
  values: JobVacancyFormValues;
  mode: VacancyFormMode;
  /** Everything still in the way of publishing, from {@link vacancyProblems}. */
  problems: JobVacancyFieldErrors;
  /** A published vacancy: the last step saves changes rather than publishing. */
  live: boolean;
  onEdit: (sectionId: string) => void;
}>) {
  const blocked = VACANCY_SECTIONS.map((section) => ({
    section,
    fields: Object.keys(sectionProblems(problems, section.id)) as JobVacancyField[],
  })).filter((entry) => entry.fields.length > 0);

  return (
    <div className="tp-step-panel">
      {blocked.length === 0 ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-success-bg bg-success-bg/60 px-4 py-3.5">
          <CheckCircleFilled aria-hidden className="mt-0.5 text-[20px] text-success-text" />
          <div className="min-w-0">
            <p className="m-0 font-semibold text-slate-900">
              {live ? 'Everything is in place.' : 'Everything is in place to publish.'}
            </p>
            <p className="m-0 mt-0.5 text-small text-slate-600">
              {live
                ? 'Read it through once more. Saved changes appear on the candidate portal straight away.'
                : createsVacancy(mode)
                  ? 'Read it through once more. Publishing puts it on the candidate portal and opens applications.'
                  : 'Read it through once more. Publishing puts this draft on the candidate portal and opens applications.'}
            </p>
          </div>
        </div>
      ) : (
        <Alert tone="warning" className="mb-5">
          <p className="m-0 font-semibold">A few things still need attention</p>
          <ul className="m-0 mt-1.5 ps-5">
            {blocked.map(({ section, fields }) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onEdit(section.id)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none"
                >
                  {section.title}
                </button>
                : {joinLabels(fields.map((field) => FIELD_LABELS[field]))}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <ol className="m-0 grid list-none gap-4 p-0">
        {VACANCY_SECTIONS.map((section) => {
          const progress = sectionProgress(values, section);
          const empty = progress.total === 0 && progress.optionalFilled === 0;
          return (
            <li key={section.id}>
              <section
                aria-labelledby={`review-${section.id}`}
                className="rounded-xl border border-slate-200 bg-surface px-4 py-4 shadow-xs sm:px-5"
              >
                <header className="mb-3 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary-50 text-caption font-semibold tabular-nums text-primary-700"
                  >
                    {section.index}
                  </span>
                  <h3 id={`review-${section.id}`} className="m-0 min-w-0 flex-1 text-lead font-semibold text-slate-900">
                    {section.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<EditOutlined aria-hidden />}
                    onClick={() => onEdit(section.id)}
                    aria-label={`Edit ${section.title}`}
                  >
                    Edit
                  </Button>
                </header>
                {empty && section.id !== 'pipeline' && section.id !== 'matching' ? (
                  <Typography.Text type="secondary" className="text-small">
                    Not added — optional.
                  </Typography.Text>
                ) : (
                  <dl className={detailGrid}>
                    <Body sectionId={section.id} values={values} />
                  </dl>
                )}
              </section>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

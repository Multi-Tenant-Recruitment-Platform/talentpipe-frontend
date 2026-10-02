import { Flex, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { JobVacancyResponse } from '../../api/types';
import { benefitLabel } from '../../dashboard/companyProfile';
import {
  employmentTypeLabel,
  formatSalary,
  formatWorkingDays,
  payPeriodLabel,
  pipelineLabel,
  shiftTypeLabel,
  workplaceTypeLabel,
} from '../../dashboard/jobVacancy';
import { fontSize, slate, space } from '../../theme/tokens';
import { formatDate } from '../../utils/format';

/**
 * Everything captured about one vacancy, read back — the body of its page.
 *
 * <p>Empty fields are omitted rather than listed as "Not set". The profile page
 * states its blanks because a half-finished company profile is a prompt to
 * finish it; a vacancy with no shift pattern is simply a vacancy that does not
 * have one, and printing nine "Not set" rows would bury the nine that matter.
 * A draft's missing *required* fields are named separately, above this, where
 * they can be acted on.</p>
 */

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  if (value === '') {
    return null;
  }
  return (
    <div style={{ minWidth: 0 }}>
      <dt
        style={{
          fontSize: fontSize.caption,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          color: slate[500],
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: `2px 0 0`, minWidth: 0 }}>
        <Typography.Text>{value}</Typography.Text>
      </dd>
    </div>
  );
}

function Block({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="tp-vacancy-block">
      {/* A plain heading rather than Typography.Title: antd's own selector
          outranks `.tp-legend` and would restore its heading size. */}
      <h2 className="tp-legend" style={{ margin: 0 }}>
        {title}
      </h2>
      <div style={{ marginTop: space[1.5] }}>{children}</div>
    </section>
  );
}

function Chips({ values }: Readonly<{ values: string[] }>) {
  return (
    <Flex gap={space[0.5]} wrap>
      {values.map((value) => (
        <Tag key={value} style={{ margin: 0 }}>
          {value}
        </Tag>
      ))}
    </Flex>
  );
}

function Lines({ values }: Readonly<{ values: string[] }>) {
  return (
    <ol style={{ margin: 0, paddingInlineStart: space[2.5] }}>
      {values.map((value) => (
        <li key={value} style={{ marginBottom: space[0.5] }}>
          <Typography.Text>{value}</Typography.Text>
        </li>
      ))}
    </ol>
  );
}

export function VacancyDetailsBody({ vacancy }: Readonly<{ vacancy: JobVacancyResponse }>) {
  return (
    <>
      <Block title="Basic information">
        <dl className="tp-detail-grid">
          <Fact label="Department" value={vacancy.department} />
          <Fact label="Openings" value={String(vacancy.openings)} />
          <Fact
            label="Employment type"
            value={employmentTypeLabel(vacancy.employmentType) ?? ''}
          />
          <Fact label="Workplace" value={workplaceTypeLabel(vacancy.workplaceType) ?? ''} />
          <Fact label="Location" value={vacancy.location} />
          <Fact
            label="Applications close"
            value={vacancy.applicationDeadline ? formatDate(vacancy.applicationDeadline) : ''}
          />
        </dl>
      </Block>

      {(vacancy.jobSummary || vacancy.jobDescription) && (
        <Block title="Job description">
          {vacancy.jobSummary && (
            <Typography.Paragraph style={{ marginBottom: space[1.5] }}>
              {vacancy.jobSummary}
            </Typography.Paragraph>
          )}
          {vacancy.jobDescription && (
            <Typography.Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
              {vacancy.jobDescription}
            </Typography.Paragraph>
          )}
          {vacancy.keyResponsibilities.length > 0 && (
            <>
              <Typography.Text strong style={{ display: 'block', marginBottom: space[1] }}>
                Key responsibilities
              </Typography.Text>
              <Lines values={vacancy.keyResponsibilities} />
            </>
          )}
        </Block>
      )}

      <Block title="Candidate requirements">
        <Flex vertical gap={space[2]}>
          {vacancy.requiredSkills.length > 0 && (
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: space[1] }}>
                Required skills
              </Typography.Text>
              <Chips values={vacancy.requiredSkills} />
            </div>
          )}
          {vacancy.preferredSkills.length > 0 && (
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: space[1] }}>
                Preferred skills
              </Typography.Text>
              <Chips values={vacancy.preferredSkills} />
            </div>
          )}
          <dl className="tp-detail-grid">
            <Fact
              label="Minimum experience"
              value={
                vacancy.minimumExperienceYears === null
                  ? ''
                  : `${vacancy.minimumExperienceYears} years`
              }
            />
            <Fact label="Education" value={vacancy.education ?? ''} />
            <Fact label="Languages" value={vacancy.languageRequirements.join(', ')} />
            <Fact label="Certifications" value={vacancy.certifications.join(', ')} />
            <Fact label="Other requirements" value={vacancy.otherRequirements ?? ''} />
          </dl>
        </Flex>
      </Block>

      {(formatSalary(vacancy) || vacancy.benefits.length > 0) && (
        <Block title="Salary & benefits">
          <Flex vertical gap={space[2]}>
            <dl className="tp-detail-grid">
              <Fact label="Salary" value={formatSalary(vacancy)} />
              <Fact label="Pay period" value={payPeriodLabel(vacancy.payPeriod) ?? ''} />
            </dl>
            {vacancy.benefits.length > 0 && (
              <Chips values={vacancy.benefits.map(benefitLabel)} />
            )}
          </Flex>
        </Block>
      )}

      <Block title="Work schedule">
        <dl className="tp-detail-grid">
          <Fact label="Working days" value={formatWorkingDays(vacancy.workingDays)} />
          <Fact label="Working hours" value={vacancy.workingHours ?? ''} />
          <Fact label="Shift" value={shiftTypeLabel(vacancy.shiftType) ?? ''} />
          <Fact
            label="Hours per week"
            value={
              vacancy.expectedHoursPerWeek === null ? '' : `${vacancy.expectedHoursPerWeek}`
            }
          />
        </dl>
      </Block>

      <Block title="Recruitment settings">
        <Flex vertical gap={space[2]}>
          <dl className="tp-detail-grid">
            <Fact label="Pipeline" value={pipelineLabel(vacancy.recruitmentPipelineId) ?? ''} />
          </dl>
          {vacancy.screeningQuestions.length > 0 && (
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: space[1] }}>
                Screening questions
              </Typography.Text>
              <Lines values={vacancy.screeningQuestions} />
            </div>
          )}
        </Flex>
      </Block>
    </>
  );
}

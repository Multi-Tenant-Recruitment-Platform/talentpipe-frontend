import { Flex, Select, Tag, Typography } from 'antd';
import type { UserResponse } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { MAX_SCREENING_QUESTIONS, PIPELINE_TEMPLATES } from '../../dashboard/jobVacancy';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { fontSize, space } from '../../theme/tokens';
import { formatRole } from '../../utils/format';
import { BulletListEditor } from './BulletListEditor';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria, vacancyFieldId } from './vacancyFieldIds';

const personOption = (member: UserResponse) => ({
  value: member.id,
  label: `${member.firstName} ${member.lastName} · ${formatRole(member.role)}`,
});

export function RecruitmentSettingsSection({
  values,
  errors,
  set,
}: Readonly<VacancySectionProps>) {
  const allow = useCan();
  const { activeMembers, loading } = useTeamSummary();

  // GET /team is COMPANY_ADMIN-only on the backend, so an HR manager has no
  // roster to choose from. Showing an empty dropdown would read as a broken
  // control; saying who can assign is the honest version, and the vacancy is
  // still perfectly valid without either name.
  const canSeeRoster = allow('team.view');

  const rosterHint = canSeeRoster
    ? undefined
    : 'Only a company admin can assign people to a vacancy. Yours can set this after you create it.';

  const recruiters = activeMembers.filter(
    (member) => member.role === 'HR_MANAGER' || member.role === 'COMPANY_ADMIN',
  );

  const pipeline = PIPELINE_TEMPLATES.find(
    (template) => template.id === values.recruitmentPipelineId,
  );

  return (
    <>
      <VacancyField
        field="assignedRecruiterId"
        span={12}
        error={errors.assignedRecruiterId}
        hint={rosterHint ?? 'Who screens and schedules for this role.'}
      >
        <Select
          {...fieldAria('assignedRecruiterId', errors.assignedRecruiterId)}
          value={values.assignedRecruiterId === '' ? undefined : values.assignedRecruiterId}
          options={recruiters.map(personOption)}
          loading={loading}
          disabled={!canSeeRoster}
          placeholder={canSeeRoster ? 'Choose a recruiter' : 'Needs team access'}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          onChange={(next: string | undefined) => set('assignedRecruiterId', next ?? '')}
        />
      </VacancyField>

      <VacancyField
        field="hiringManagerId"
        span={12}
        error={errors.hiringManagerId}
        hint={rosterHint ?? 'Who owns the decision and sits on the panel.'}
      >
        <Select
          {...fieldAria('hiringManagerId', errors.hiringManagerId)}
          value={values.hiringManagerId === '' ? undefined : values.hiringManagerId}
          options={activeMembers.map(personOption)}
          loading={loading}
          disabled={!canSeeRoster}
          placeholder={canSeeRoster ? 'Choose a hiring manager' : 'Needs team access'}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          onChange={(next: string | undefined) => set('hiringManagerId', next ?? '')}
        />
      </VacancyField>

      <VacancyField
        field="recruitmentPipelineId"
        span={24}
        error={errors.recruitmentPipelineId}
        hint="The stages applicants move through. Defaults to your standard pipeline if left blank."
      >
        <Select
          {...fieldAria('recruitmentPipelineId', errors.recruitmentPipelineId)}
          value={values.recruitmentPipelineId === '' ? undefined : values.recruitmentPipelineId}
          options={PIPELINE_TEMPLATES.map((template) => ({
            value: template.id,
            label: template.label,
          }))}
          placeholder="Choose a pipeline"
          allowClear
          style={{ width: '100%' }}
          onChange={(next: string | undefined) => set('recruitmentPipelineId', next ?? '')}
        />
        {pipeline && (
          <Flex align="center" gap={space[0.5]} wrap style={{ marginTop: space[1] }}>
            {pipeline.stages.map((stage, index) => (
              <Flex key={stage} align="center" gap={space[0.5]}>
                {index > 0 && (
                  <Typography.Text type="secondary" aria-hidden="true" style={{ fontSize: fontSize.caption }}>
                    →
                  </Typography.Text>
                )}
                <Tag style={{ margin: 0 }}>{stage}</Tag>
              </Flex>
            ))}
          </Flex>
        )}
      </VacancyField>

      <VacancyField
        field="screeningQuestions"
        span={24}
        error={errors.screeningQuestions}
        hint="Asked of every applicant at the point they apply. Keep them answerable in a sentence."
        group
      >
        <BulletListEditor
          id={vacancyFieldId('screeningQuestions')}
          values={values.screeningQuestions}
          invalid={Boolean(errors.screeningQuestions)}
          placeholder="e.g. Do you hold the right to work in Sri Lanka?"
          addLabel="Add question"
          itemLabel="Question"
          max={MAX_SCREENING_QUESTIONS}
          onChange={(next) => set('screeningQuestions', next)}
        />
      </VacancyField>
    </>
  );
}

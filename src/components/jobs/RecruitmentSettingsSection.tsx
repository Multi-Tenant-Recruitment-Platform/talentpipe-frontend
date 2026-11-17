import { InputNumber, Select, Switch } from 'antd';
import type { UserResponse } from '../../api/types';
import { roleLabelFor } from '../../auth/permissions';
import { useCan } from '../../auth/useCan';
import { MAX_SCREENING_QUESTIONS } from '../../dashboard/jobVacancy';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { BulletListEditor } from './BulletListEditor';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria, vacancyFieldId } from './vacancyFieldIds';
import { PipelineTemplatePicker } from './PipelineTemplatePicker';

const personOption = (member: UserResponse) => ({
  value: member.id,
  label: `${member.firstName} ${member.lastName} · ${roleLabelFor(member)}`,
});

export function RecruitmentSettingsSection({
  values,
  errors,
  set,
}: Readonly<VacancySectionProps>) {
  const allow = useCan();
  const { activeMembers, loading } = useTeamSummary();

  // GET /team needs team.view, so a role without it has no roster to
  // choose from. Showing an empty dropdown would read as a broken
  // control; saying who can assign is the honest version, and the vacancy is
  // still perfectly valid without either name.
  const canSeeRoster = allow('team.view');

  const rosterHint = canSeeRoster
    ? undefined
    : 'Only someone who can see your team can assign people. They can set this after you create it.';

  // Any active member may recruit for a role — with company roles, a custom
  // "Talent Partner" is as likely a recruiter as the default Recruiter — so
  // the list is everyone, labelled with the role they hold.
  const recruiters = activeMembers;

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
          className="w-full"
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
          className="w-full"
          onChange={(next: string | undefined) => set('hiringManagerId', next ?? '')}
        />
      </VacancyField>

      <VacancyField
        field="recruitmentPipelineId"
        span={24}
        error={errors.recruitmentPipelineId}
        hint="The stages applicants move through. Selecting a template applies its screening defaults."
      >
        <PipelineTemplatePicker
          value={values.recruitmentPipelineId}
          error={errors.recruitmentPipelineId}
          onChange={(template) => {
            set('recruitmentPipelineId', template?.id ?? '');
            set('autoThreshold', template?.defaultAutoThreshold ?? null);
            set('manualThreshold', template?.defaultManualThreshold ?? null);
            set('blindModeEnabled', template?.blindModeEnabled ?? false);
          }}
        />
      </VacancyField>

      <VacancyField field="autoThreshold" span={12} error={errors.autoThreshold}>
        <InputNumber
          {...fieldAria('autoThreshold', errors.autoThreshold)}
          status={errors.autoThreshold ? 'error' : undefined}
          value={values.autoThreshold}
          min={0}
          max={100}
          className="w-full"
          addonAfter="/ 100"
          onChange={(next) => set('autoThreshold', typeof next === 'number' ? next : null)}
        />
      </VacancyField>

      <VacancyField field="manualThreshold" span={12} error={errors.manualThreshold}>
        <InputNumber
          {...fieldAria('manualThreshold', errors.manualThreshold)}
          status={errors.manualThreshold ? 'error' : undefined}
          value={values.manualThreshold}
          min={0}
          max={100}
          className="w-full"
          addonAfter="/ 100"
          onChange={(next) => set('manualThreshold', typeof next === 'number' ? next : null)}
        />
      </VacancyField>

      <VacancyField field="blindModeEnabled" span={24} hint="Hide candidate identity during screening.">
        <Switch
          id={vacancyFieldId('blindModeEnabled')}
          checked={values.blindModeEnabled}
          onChange={(checked) => set('blindModeEnabled', checked)}
        />
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

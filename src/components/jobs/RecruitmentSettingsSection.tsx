import { Select } from 'antd';
import type { UserResponse } from '../../api/types';
import { roleLabelFor } from '../../auth/permissions';
import { useCan } from '../../auth/useCan';
import { MAX_SCREENING_QUESTIONS } from '../../dashboard/jobVacancy';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { BulletListEditor } from './BulletListEditor';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria, vacancyFieldId } from './vacancyFieldIds';

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

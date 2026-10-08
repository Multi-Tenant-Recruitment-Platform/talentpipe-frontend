import { Input } from 'antd';
import { MAX_DESCRIPTION, MAX_SUMMARY } from '../../dashboard/jobVacancy';
import { BulletListEditor } from './BulletListEditor';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria, vacancyFieldId } from './vacancyFieldIds';

export function JobDescriptionSection({ values, errors, set }: Readonly<VacancySectionProps>) {
  return (
    <>
      <VacancyField
        field="jobSummary"
        span={24}
        error={errors.jobSummary}
        hint="One or two lines. This is what appears in search results and on the job board."
      >
        <Input.TextArea
          {...fieldAria('jobSummary', errors.jobSummary)}
          value={values.jobSummary}
          status={errors.jobSummary ? 'error' : undefined}
          rows={2}
          maxLength={MAX_SUMMARY}
          showCount
          placeholder="Lead the services behind our candidate pipeline, working with a team of six."
          onChange={(event) => set('jobSummary', event.target.value)}
        />
      </VacancyField>

      <VacancyField
        field="jobDescription"
        span={24}
        error={errors.jobDescription}
        hint="The body of the advert: the team, the work, and why the role exists."
      >
        <Input.TextArea
          {...fieldAria('jobDescription', errors.jobDescription)}
          value={values.jobDescription}
          status={errors.jobDescription ? 'error' : undefined}
          autoSize={{ minRows: 8, maxRows: 20 }}
          maxLength={MAX_DESCRIPTION}
          showCount
          placeholder="Describe the role, the team it joins, and what success looks like in the first year."
          onChange={(event) => set('jobDescription', event.target.value)}
        />
      </VacancyField>

      <VacancyField
        field="keyResponsibilities"
        span={24}
        error={errors.keyResponsibilities}
        hint="One per line, in the order they matter. These are listed on the advert."
        group
      >
        <BulletListEditor
          id={vacancyFieldId('keyResponsibilities')}
          values={values.keyResponsibilities}
          invalid={Boolean(errors.keyResponsibilities)}
          placeholder="e.g. Own the design and delivery of the candidate matching service"
          addLabel="Add responsibility"
          itemLabel="Responsibility"
          onChange={(next) => set('keyResponsibilities', next)}
        />
      </VacancyField>
    </>
  );
}

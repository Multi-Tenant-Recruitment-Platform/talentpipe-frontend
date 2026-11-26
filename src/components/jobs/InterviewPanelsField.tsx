import { Skeleton } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { pipelineTemplatesApi } from '../../api/pipelineTemplates';
import { createsVacancy, panelDraftsFor } from '../../dashboard/jobVacancy';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { InterviewPanelEditor } from './InterviewPanelEditor';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';

/**
 * The interview panels in the vacancy form: one per interview round of the
 * chosen pipeline.
 *
 * <p>A new vacancy learns its rounds from the template as soon as one is
 * chosen; a stored one brings its panels with it (the edit page reads them
 * before opening the form). A draft can be saved with panels half chosen;
 * Publish needs every round to have exactly as many people as it asks for.</p>
 *
 * <p>Company-side only. Nothing here reaches the job advert candidates see.</p>
 */
export function InterviewPanelsField({ values, errors, set, mode }: Readonly<VacancySectionProps>) {
  const creating = createsVacancy(mode);
  const templateId = creating ? values.pipelineTemplateId : '';
  const { loading, error, retry } = useTemplateRounds(templateId, values, set);

  if (creating && templateId === '') {
    return null;
  }

  let body;
  if (loading) {
    body = <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  } else if (error) {
    body = (
      <Alert tone="error">
        <span>We couldn't load this pipeline's interview rounds. {error} </span>
        <Button variant="ghost" size="sm" onClick={retry}>
          Try again
        </Button>
      </Alert>
    );
  } else if (values.interviewPanels === null) {
    return null;
  } else {
    body = (
      <InterviewPanelEditor
        panels={values.interviewPanels}
        showShortfall={Boolean(errors.interviewPanels)}
        onChange={(next) => set('interviewPanels', next)}
      />
    );
  }

  return (
    <VacancyField
      field="interviewPanels"
      span={24}
      group
      required
      hint={
        errors.interviewPanels
          ? undefined
          : 'Choose how many people interview in each round, then who. Anyone in your company can be chosen. A draft can be saved with panels unfinished; publishing needs every round complete.'
      }
    >
      {body}
    </VacancyField>
  );
}

/**
 * Reads the chosen template's stages and turns its interview rounds into
 * panels — once per template, keeping any panel already in the form for the
 * same round (a duplicate arrives with the original's).
 */
function useTemplateRounds(
  templateId: string,
  values: VacancySectionProps['values'],
  set: VacancySectionProps['set'],
) {
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The panels as they are when the answer lands, not when the request went out.
  const panels = useRef(values.interviewPanels);
  useEffect(() => {
    panels.current = values.interviewPanels;
  }, [values.interviewPanels]);

  useEffect(() => {
    if (templateId === '') {
      return;
    }
    let live = true;
    pipelineTemplatesApi
      .get(templateId)
      .then((template) => {
        if (live) {
          set('interviewPanels', panelDraftsFor(template.stages, panels.current));
          setError(null);
          setLoadedId(templateId);
        }
      })
      .catch((err: unknown) => {
        if (live) {
          setError(apiErrorMessage(err, 'Try again in a moment.'));
          setLoadedId(templateId);
        }
      });
    return () => {
      live = false;
    };
  }, [templateId, attempt, set]);

  return {
    loading: templateId !== '' && loadedId !== templateId,
    error: loadedId === templateId ? error : null,
    retry: () => {
      setLoadedId(null);
      setAttempt((n) => n + 1);
    },
  };
}

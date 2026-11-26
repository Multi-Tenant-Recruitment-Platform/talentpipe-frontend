import { Col, InputNumber, Select, Switch, Tag, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PipelineTemplateSummary } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { createsVacancy, pipelineShape, runsOnPipeline } from '../../dashboard/jobVacancy';
import { usePipelineTemplateList } from '../../dashboard/usePipelineTemplates';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InterviewPanelsField } from './InterviewPanelsField';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria } from './vacancyFieldIds';

/**
 * Section 06: the pipeline a vacancy runs on, and how AI screening sorts its
 * applicants.
 *
 * <p>The template is chosen once. A new vacancy picks one of the company's
 * active templates, and the server copies its stages when the vacancy is
 * stored; from then on the template is fixed, so an edit shows it as a badge
 * rather than a control that could only be refused. The screening settings
 * stay editable while the vacancy is: they start as the template's defaults,
 * and changing them changes this vacancy only.</p>
 */
export function PipelineScreeningSection(props: Readonly<VacancySectionProps>) {
  return createsVacancy(props.mode) ? <ChooseTemplate {...props} /> : <StoredPipeline {...props} />;
}

/* --- New vacancy: choose a template --------------------------------------- */

function ChooseTemplate({ values, errors, set, mode }: Readonly<VacancySectionProps>) {
  const allow = useCan();
  const { templates: listedTemplates, loading, error, refresh } = usePipelineTemplateList('', false);
  const templates = listedTemplates.filter((template) => template.status === 'ACTIVE');

  // A duplicate arrives with the original's template preselected. Once the
  // list is in, a template that is no longer active cannot be used, so the
  // choice is dropped — the form must not send it — and the reason stays on
  // screen until another is chosen. Checked once: later choices come from the
  // list itself.
  const [copiedId] = useState(values.pipelineTemplateId);
  const copiedIsGone = copiedId !== '' && !loading && !error && !templates.some((template) => template.id === copiedId);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || loading || error) {
      return;
    }
    checked.current = true;
    if (copiedIsGone && values.pipelineTemplateId === copiedId) {
      set('pipelineTemplateId', '');
    }
  }, [loading, error, copiedIsGone, copiedId, values.pipelineTemplateId, set]);

  const chosen = templates.find((template) => template.id === values.pipelineTemplateId) ?? null;
  const unavailable = copiedIsGone && !chosen;
  // A template change asked for while panels are filled in, waiting on a yes.
  const [pending, setPending] = useState<PipelineTemplateSummary | null>(null);
  const panelsStarted = (values.interviewPanels ?? []).some(
    (panel) => panel.interviewerCount !== null || panel.interviewers.length > 0,
  );

  function choose(template: PipelineTemplateSummary) {
    setPending(null);
    if (template.id !== values.pipelineTemplateId) {
      // Panels belong to the old template's rounds; the new one's are read afresh.
      set('interviewPanels', null);
    }
    set('pipelineTemplateId', template.id);
    // Choosing is when the template's defaults apply; the recruiter adjusts from there.
    set('autoThreshold', template.defaultAutoThreshold);
    set('manualThreshold', template.defaultManualThreshold);
    set('blindModeEnabled', template.blindModeEnabled);
  }

  if (error) {
    return (
      <Col span={24}>
        <Alert tone="error">
          <span>We couldn't load your pipeline templates. {error} </span>
          <Button variant="ghost" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </Alert>
      </Col>
    );
  }

  if (!loading && templates.length === 0) {
    return (
      <Col span={24}>
        <Alert tone="warning">
          {allow('templates.manage') ? (
          <>
            A vacancy runs on a pipeline template, and this workspace has none yet.{' '}
            <Link to="/dashboard/pipeline-templates/new" className="tp-cta-link">
              Create a pipeline template
            </Link>
          </>
        ) : (
          'A vacancy runs on a pipeline template, and this workspace has none yet. Ask a workspace admin to create a pipeline template.'
          )}
        </Alert>
      </Col>
    );
  }

  const hint = chosen
    ? `Defaults from ${chosen.name}; changes apply to this vacancy only.`
    : 'The stages applicants move through. It cannot be changed once the vacancy is saved.';

  return (
    <>
      {unavailable && (
        <Col span={24}>
          <Alert tone="warning">The original's pipeline template is no longer available. Choose another.</Alert>
        </Col>
      )}
      <VacancyField field="pipelineTemplateId" span={24} error={errors.pipelineTemplateId} hint={hint} required>
        <Select
          {...fieldAria('pipelineTemplateId', errors.pipelineTemplateId)}
          value={chosen ? chosen.id : undefined}
          loading={loading}
          disabled={loading}
          placeholder={loading ? 'Loading templates…' : 'Choose a pipeline template'}
          showSearch
          optionFilterProp="label"
          className="w-full"
          options={templates.map((template) => ({
            value: template.id,
            label: `${template.name} · ${pipelineShape(template)}`,
          }))}
          onChange={(id: string) => {
            const template = templates.find((entry) => entry.id === id);
            if (!template) {
              return;
            }
            if (panelsStarted && values.pipelineTemplateId !== '' && template.id !== values.pipelineTemplateId) {
              setPending(template);
            } else {
              choose(template);
            }
          }}
        />
      </VacancyField>
      {chosen && <ScreeningSettings values={values} errors={errors} set={set} mode={mode} />}
      {chosen && <InterviewPanelsField values={values} errors={errors} set={set} mode={mode} />}
      <ConfirmDialog
        open={pending !== null}
        tone="warning"
        title="Change the pipeline template?"
        description="The interview panels you set up belong to this template's rounds. Choosing another template clears them."
        confirmLabel="Change template"
        cancelLabel="Keep this template"
        fallbackFocusId="vacancy-pipelineTemplateId"
        onConfirm={() => pending && choose(pending)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

/* --- Stored vacancy: the template is fixed -------------------------------- */

function StoredPipeline({ values, errors, set, mode }: Readonly<VacancySectionProps>) {
  // Decided from the vacancy as it was opened, so clearing a threshold while
  // editing never makes the section vanish under the cursor.
  const [onPipeline] = useState(() => runsOnPipeline(values));

  if (!onPipeline) {
    return (
      <Col span={24}>
        <Typography.Text type="secondary">
          This vacancy was created before pipeline templates, so it has no screening settings.
        </Typography.Text>
      </Col>
    );
  }

  return (
    <>
      <VacancyField field="pipelineTemplateId" span={24} hint="Fixed when the vacancy was created." group>
        <Tag className="m-0 text-small">
          {values.pipelineTemplateName || 'Template deleted — this vacancy keeps its own copy.'}
        </Tag>
      </VacancyField>
      <ScreeningSettings values={values} errors={errors} set={set} mode={mode} />
      <InterviewPanelsField values={values} errors={errors} set={set} mode={mode} />
    </>
  );
}

/* --- The settings, in every mode ------------------------------------------ */

function ScreeningSettings({ values, errors, set }: Readonly<VacancySectionProps>) {
  const toScore = (next: number | string | null) => (typeof next === 'number' ? next : null);

  return (
    <>
      <VacancyField
        field="autoThreshold"
        span={8}
        error={errors.autoThreshold}
        hint="Scores at or above this move on automatically."
      >
        <InputNumber
          {...fieldAria('autoThreshold', errors.autoThreshold)}
          value={values.autoThreshold}
          min={0}
          max={100}
          precision={0}
          className="w-full"
          onChange={(next) => set('autoThreshold', toScore(next))}
        />
      </VacancyField>

      <VacancyField
        field="manualThreshold"
        span={8}
        error={errors.manualThreshold}
        hint="From here up to the auto threshold, a person decides. Lower scores are rejected."
      >
        <InputNumber
          {...fieldAria('manualThreshold', errors.manualThreshold)}
          value={values.manualThreshold}
          min={0}
          max={100}
          precision={0}
          className="w-full"
          onChange={(next) => set('manualThreshold', toScore(next))}
        />
      </VacancyField>

      <VacancyField
        field="blindModeEnabled"
        span={8}
        error={errors.blindModeEnabled}
        hint="Reviewers screen applicants without seeing who they are."
      >
        <Switch
          {...fieldAria('blindModeEnabled', errors.blindModeEnabled)}
          checked={values.blindModeEnabled}
          onChange={(next) => set('blindModeEnabled', next)}
        />
      </VacancyField>
    </>
  );
}

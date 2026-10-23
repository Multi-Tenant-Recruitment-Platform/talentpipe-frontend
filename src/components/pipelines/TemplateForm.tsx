import { WarningOutlined } from '@ant-design/icons';
import { Col, Flex, Input, InputNumber, Row, Switch, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DESCRIPTION_MAX,
  firstInvalidField,
  isTemplateDirty,
  isValidScore,
  MESSAGES,
  NAME_MAX,
  parseServerFieldErrors,
  roundBenchmarkField,
  roundNameField,
  ruleMessageField,
  validateTemplate,
  type TemplateErrors,
  type TemplateField,
  type TemplateFormValues,
} from '../../dashboard/pipelineTemplate';
import { describeTemplateError } from '../../dashboard/pipelineTemplateErrors';
import { space } from '../../theme/tokens';
import { PageHeader } from '../dashboard/PageHeader';
import { Alert, type AlertTone } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FieldError } from '../ui/FieldError';
import { ScoreBandBar } from './ScoreBandBar';
import { StageBuilder } from './StageBuilder';
import { ADD_ROUND_BUTTON_ID, templateErrorId, templateFieldAria, templateFieldId, templateHintId } from './templateFieldIds';
import { TemplateSectionCard } from './TemplateSectionCard';
import { TemplateSectionRail } from './TemplateSectionRail';
import { sectionOf, TEMPLATE_SECTIONS } from './templateSections';

type TemplateFormMode = 'create' | 'edit';

const HEADINGS: Record<TemplateFormMode, { title: string; subtitle: string; save: string }> = {
  create: {
    title: 'Create pipeline template',
    subtitle: 'Set the stages, interview benchmarks and screening defaults once. Jobs copy them when they are created.',
    save: 'Save template',
  },
  edit: {
    title: 'Edit pipeline template',
    subtitle: 'Changes apply to jobs created after you save.',
    save: 'Save changes',
  },
};

interface FormNotice {
  tone: AlertTone;
  text: string;
  retry?: boolean;
}

/** Which fields a change touched — so a server error clears only on the field it named. */
function changedFields(prev: TemplateFormValues, next: TemplateFormValues): TemplateField[] {
  const fields: TemplateField[] = [];
  if (prev.name !== next.name) fields.push('name');
  if (prev.description !== next.description) fields.push('description');
  if (prev.autoThreshold !== next.autoThreshold) fields.push('autoThreshold');
  if (prev.manualThreshold !== next.manualThreshold) fields.push('manualThreshold');
  for (const round of next.rounds) {
    const before = prev.rounds.find((r) => r.key === round.key);
    if (!before || before.name !== round.name) fields.push(roundNameField(round.key));
    if (!before || before.benchmark !== round.benchmark) fields.push(roundBenchmarkField(round.key));
  }
  return fields;
}

const smooth = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/**
 * The template editor, for create and edit alike (PT-1 → PT-5, PT-7).
 *
 * <p>Errors appear once a field has been left, or once the admin asks what is
 * wrong — never while the first character is still being typed. The one
 * exception is the threshold pair: "manual must be lower than auto" is shown
 * the moment it is true, because both fields start filled in and the rule is
 * about their relationship, not about either one being finished.</p>
 *
 * <p>Save stays disabled until the form is valid, as the spec asks. A disabled
 * button on its own says nothing about why, so the action bar names the count
 * of issues as a button that takes you to the first one.</p>
 */
export function TemplateForm({
  mode,
  initialValues,
  takenNames,
  banner,
  exitTo,
  exitLabel,
  onSubmit,
}: Readonly<{
  mode: TemplateFormMode;
  initialValues: TemplateFormValues;
  /** The company's other active template names, for the early duplicate warning. */
  takenNames: readonly string[];
  banner?: ReactNode;
  exitTo: string;
  exitLabel: string;
  /** Sends the request and navigates away. Throws on failure; the form explains it. */
  onSubmit: (values: TemplateFormValues) => Promise<void>;
}>) {
  const navigate = useNavigate();
  const heading = HEADINGS[mode];

  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<ReadonlySet<TemplateField>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [serverErrors, setServerErrors] = useState<TemplateErrors>({});
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [activeSection, setActiveSection] = useState(TEMPLATE_SECTIONS[0].id);

  const dirty = isTemplateDirty(values, initialValues);

  const ruleErrors = useMemo(() => validateTemplate(values, takenNames), [values, takenNames]);
  const errors: TemplateErrors = useMemo(() => ({ ...ruleErrors, ...serverErrors }), [ruleErrors, serverErrors]);
  const issueFields = Object.keys(errors) as TemplateField[];
  const issueCount = issueFields.length;

  const visibleErrors = useMemo(() => {
    const shown: TemplateErrors = {};
    for (const [field, message] of Object.entries(errors) as [TemplateField, string][]) {
      const relational = field === 'manualThreshold' && message === MESSAGES.thresholdOrder;
      if (showAll || touched.has(field) || relational || serverErrors[field]) {
        shown[field] = message;
      }
    }
    return shown;
  }, [errors, showAll, touched, serverErrors]);

  const visibleCount = Object.keys(visibleErrors).length;

  const errorSections = useMemo(
    () => new Set((Object.keys(visibleErrors) as TemplateField[]).map(sectionOf)),
    [visibleErrors],
  );

  function change(next: TemplateFormValues) {
    const changed = changedFields(values, next);
    if (changed.some((field) => serverErrors[field])) {
      const kept = { ...serverErrors };
      changed.forEach((field) => delete kept[field]);
      setServerErrors(kept);
    }
    setValues(next);
    setNotice(null);
  }

  const touch = useCallback((field: TemplateField) => {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  }, []);

  /* --- Leaving with unsaved work ----------------------------------------- */

  useEffect(() => {
    if (!dirty || submitting) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, submitting]);

  function cancel() {
    if (dirty) {
      setConfirmCancel(true);
    } else {
      navigate(exitTo);
    }
  }

  /* --- Wayfinding --------------------------------------------------------- */

  const visible = useRef(new Set<string>());
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.current.add(entry.target.id);
          } else {
            visible.current.delete(entry.target.id);
          }
        }
        const current = TEMPLATE_SECTIONS.find((section) => visible.current.has(section.id));
        if (current) {
          setActiveSection(current.id);
        }
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    TEMPLATE_SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });
    return () => observer.disconnect();
  }, []);

  function jumpTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: smooth(), block: 'start' });
    setActiveSection(sectionId);
  }

  function focusField(field: TemplateField) {
    const target = document.getElementById(field === 'rounds' ? ADD_ROUND_BUTTON_ID : templateFieldId(field));
    target?.scrollIntoView({ behavior: smooth(), block: 'center' });
    target?.focus({ preventScroll: true });
  }

  /** "N issues to fix": flag everything, then go to the first one. */
  function showIssues() {
    setShowAll(true);
    const first = firstInvalidField(values, errors);
    if (first) {
      focusField(first);
    }
  }

  /** "N fields to complete": go to the first one, without flagging anything red. */
  function focusFirstIncomplete() {
    const first = firstInvalidField(values, errors);
    if (first) {
      focusField(first);
    }
  }

  /* --- Save ---------------------------------------------------------------- */

  // The field a failed save points at. Focused once the form is enabled
  // again — a control disabled mid-save can't take focus.
  const focusAfterSave = useRef<TemplateField | null>(null);
  useEffect(() => {
    if (submitting || !focusAfterSave.current) {
      return;
    }
    const field = focusAfterSave.current;
    focusAfterSave.current = null;
    focusField(field);
  }, [submitting]);

  async function save() {
    if (submitting) {
      return;
    }
    if (issueCount > 0) {
      showIssues();
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      const plan = describeTemplateError(err, mode === 'create' ? 'create' : 'save');
      if (plan.nameTaken) {
        setServerErrors((current) => ({ ...current, name: MESSAGES.nameTaken }));
        focusAfterSave.current = 'name';
      } else if (plan.validation) {
        // Field errors arrive as `field: reason; …`; a rule refusal is one
        // sentence. Either lands on its field when it names one, and whatever
        // names none goes to the alert above the action bar.
        const parsed = parseServerFieldErrors(plan.validation, values);
        const rest: string[] = [];
        for (const part of parsed.rest) {
          const rule = ruleMessageField(part);
          if (rule) {
            parsed.errors[rule.field] = rule.text;
          } else {
            rest.push(part);
          }
        }
        setServerErrors(parsed.errors);
        setShowAll(true);
        const first = firstInvalidField(values, parsed.errors);
        if (rest.length > 0 || !first) {
          setNotice({ tone: 'error', text: rest.join(' ') || plan.message });
        }
        focusAfterSave.current = first;
      } else {
        setNotice({ tone: plan.tone, text: plan.message, retry: !plan.notFound && !plan.unavailable });
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* --- Render ------------------------------------------------------------- */

  const { autoThreshold: auto, manualThreshold: manual } = values;
  const bandReady = isValidScore(auto) && isValidScore(manual) && manual < auto;

  const label = (text: string, field: TemplateField, required = true) => (
    <label htmlFor={templateFieldId(field)} className="mb-1.5 block font-medium">
      {text}
      {required && (
        <>
          {' '}
          <span aria-hidden="true" className="font-normal text-slate-400">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </label>
  );

  const below = (field: TemplateField, hint?: ReactNode, hintClass = '') =>
    visibleErrors[field] ? (
      <FieldError id={templateErrorId(field)}>{visibleErrors[field]}</FieldError>
    ) : (
      hint && (
        <Typography.Text id={templateHintId(field)} type="secondary" className={`mt-1.5 block text-caption ${hintClass}`}>
          {hint}
        </Typography.Text>
      )
    );

  const sections: Record<string, ReactNode> = {
    'template-details': (
      <Row gutter={[space[2.5], space[2.5]]}>
        <Col xs={24}>
          {label('Template name', 'name')}
          <Input
            {...templateFieldAria('name', visibleErrors.name, true)}
            value={values.name}
            maxLength={NAME_MAX}
            showCount
            disabled={submitting}
            autoComplete="off"
            placeholder="e.g. Engineering hiring"
            onChange={(event) => change({ ...values, name: event.target.value })}
            onBlur={() => touch('name')}
          />
          {below('name', 'Must be unique among your active templates.')}
        </Col>
        <Col xs={24}>
          {label('Description', 'description', false)}
          <Input.TextArea
            {...templateFieldAria('description', visibleErrors.description, true)}
            value={values.description}
            maxLength={DESCRIPTION_MAX}
            showCount
            autoSize={{ minRows: 3, maxRows: 6 }}
            disabled={submitting}
            placeholder="When to use this template, e.g. engineering roles with a technical round"
            onChange={(event) => change({ ...values, description: event.target.value })}
            onBlur={() => touch('description')}
          />
          {/* Right padding keeps the hint clear of the textarea's character count. */}
          {below('description', 'Optional. Helps job creators choose the right template.', 'pe-20')}
        </Col>
      </Row>
    ),
    'template-stages': (
      <StageBuilder
        values={values}
        errors={visibleErrors}
        disabled={submitting}
        onChange={change}
        onBlurField={touch}
      />
    ),
    'template-thresholds': values.includeScreening ? (
      <>
        <Row gutter={[space[2.5], space[2.5]]}>
          <Col xs={24} sm={12}>
            {label('Auto-advance threshold', 'autoThreshold')}
            <InputNumber
              {...templateFieldAria('autoThreshold', visibleErrors.autoThreshold, true)}
              value={values.autoThreshold}
              step={1}
              suffix="/ 100"
              disabled={submitting}
              className="w-full"
              onChange={(next) => change({ ...values, autoThreshold: typeof next === 'number' ? next : null })}
              onBlur={() => touch('autoThreshold')}
            />
            {below('autoThreshold', 'Scores at or above this move on automatically.')}
          </Col>
          <Col xs={24} sm={12}>
            {label('Manual-review threshold', 'manualThreshold')}
            <InputNumber
              {...templateFieldAria('manualThreshold', visibleErrors.manualThreshold, true)}
              value={values.manualThreshold}
              step={1}
              suffix="/ 100"
              disabled={submitting}
              className="w-full"
              onChange={(next) => change({ ...values, manualThreshold: typeof next === 'number' ? next : null })}
              onBlur={() => touch('manualThreshold')}
            />
            {below(
              'manualThreshold',
              'Scores from here up to the auto threshold wait for a person to decide. Lower scores are rejected.',
            )}
          </Col>
        </Row>
        <div className="mt-5 rounded-lg border border-slate-200 bg-canvas p-4">
          {bandReady ? (
            <ScoreBandBar auto={auto} manual={manual} />
          ) : (
            <p className="m-0 flex items-center gap-2 text-small text-slate-600">
              <WarningOutlined aria-hidden className="text-[14px]" />
              Fix the thresholds above to preview how applicants are sorted.
            </p>
          )}
        </div>
        <p className="m-0 mt-3 text-caption text-slate-500">Jobs can adjust these when they're created.</p>
      </>
    ) : (
      <p className="m-0 rounded-lg bg-slate-50 px-4 py-3 text-small text-slate-600">
        Thresholds apply only when the pipeline includes Screening. Add the screening stage above to set them.
      </p>
    ),
    'template-matching': (
      <div className="flex items-start gap-3">
        <Switch
          id="template-ideal-matching"
          checked={values.idealMatchingEnabled}
          disabled={submitting}
          aria-describedby="template-ideal-matching-hint"
          onChange={(checked) => change({ ...values, idealMatchingEnabled: checked })}
        />
        <div>
          <label htmlFor="template-ideal-matching" className="block cursor-pointer font-medium">
            Allow ideal-person matching
          </label>
          <Typography.Text id="template-ideal-matching-hint" type="secondary" className="mt-0.5 block text-small">
            Job creators can add an ideal-candidate scorecard to jobs that use this template. Each job decides whether
            it's an extra score for reviewers or a screening rule.
          </Typography.Text>
        </div>
      </div>
    ),
  };

  return (
    <section>
      <PageHeader title={heading.title} subtitle={heading.subtitle}>
        <Button variant="ghost" onClick={cancel}>
          {exitLabel}
        </Button>
      </PageHeader>

      <div className="grid items-start gap-6 *:min-w-0 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <TemplateSectionRail activeId={activeSection} errorSections={errorSections} onJump={jumpTo} />

        <form
          noValidate
          aria-label={heading.title}
          className="max-w-3xl"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {banner}

          <Flex vertical gap={space[2.5]}>
            {TEMPLATE_SECTIONS.map((section) => (
              <TemplateSectionCard key={section.id} section={section} hasError={errorSections.has(section.id)}>
                {sections[section.id]}
              </TemplateSectionCard>
            ))}
          </Flex>

          {notice && (
            <Alert tone={notice.tone} onDismiss={() => setNotice(null)} className="mt-5">
              <Flex wrap align="center" justify="space-between" gap={12}>
                <span>{notice.text}</span>
                {notice.retry && (
                  <Button size="sm" variant="secondary" onClick={() => void save()} disabled={submitting}>
                    Try again
                  </Button>
                )}
              </Flex>
            </Alert>
          )}

          <div className="sticky bottom-0 z-15 mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/92 px-4 py-3 shadow-md backdrop-blur-[10px]">
            <div className="max-sm:basis-full" aria-live="polite">
              {/* Red only once there is something wrong to show. Before that,
                  the count is just the work left — an untouched form is not
                  an error, and must not look like one. */}
              {visibleCount > 0 ? (
                <button
                  type="button"
                  className="tp-link-button inline-flex items-center gap-1.5 text-small text-error-text"
                  onClick={showIssues}
                >
                  <WarningOutlined aria-hidden className="text-[14px]" />
                  {issueCount === 1 ? '1 issue to fix' : `${issueCount} issues to fix`}
                </button>
              ) : issueCount > 0 ? (
                <button
                  type="button"
                  className="tp-link-button text-small font-medium text-slate-600"
                  onClick={focusFirstIncomplete}
                >
                  {issueCount === 1 ? '1 field to complete' : `${issueCount} fields to complete`}
                </button>
              ) : (
                <Typography.Text type="secondary" className="text-small">
                  {dirty || mode === 'create' ? 'Ready to save' : 'No unsaved changes'}
                </Typography.Text>
              )}
            </div>
            <div className="ms-auto flex flex-wrap gap-2">
              <Button variant="ghost" onClick={cancel} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} disabled={submitting || issueCount > 0}>
                {submitting ? 'Saving…' : heading.save}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={mode === 'edit' ? 'Discard your changes?' : 'Discard this template?'}
        description={
          mode === 'edit'
            ? 'Edits you have made since opening this template will not be kept.'
            : 'Nothing you have entered will be kept.'
        }
        confirmLabel={mode === 'edit' ? 'Discard changes' : 'Discard'}
        cancelLabel="Keep editing"
        fallbackFocusId={templateFieldId('name')}
        onConfirm={() => {
          setConfirmCancel(false);
          navigate(exitTo);
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </section>
  );
}

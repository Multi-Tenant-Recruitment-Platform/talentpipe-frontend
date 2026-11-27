import { ArrowLeftOutlined, ArrowRightOutlined, FileSearchOutlined, UserOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { JobVacancyResponse } from '../../api/types';
import {
  createsVacancy,
  firstInvalidField,
  formProgress,
  furthestReachableStep,
  isVacancyDirty,
  requiredFieldsOf,
  REVIEW_STEP,
  sectionOf,
  sectionProblems,
  sectionProgress,
  sectionsWithErrors,
  VACANCY_SECTIONS,
  VACANCY_STEP_IDS,
  vacancyProblems,
  validatePipeline,
  type JobVacancyField,
  type JobVacancyFieldErrors,
  type JobVacancyFormValues,
  type VacancyFormMode,
} from '../../dashboard/jobVacancy';
import { useVacancyAutosave } from '../../dashboard/useVacancyAutosave';
import { vacancyDraftStore, type StoredVacancyDraft } from '../../dashboard/vacancyDraftStore';
import { describeVacancyError, type VacancyRequestKind } from '../../dashboard/vacancyErrors';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { PageHeader } from '../dashboard/PageHeader';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AutosaveStatus } from './AutosaveStatus';
import { BasicInformationSection } from './BasicInformationSection';
import { CandidateRequirementsSection } from './CandidateRequirementsSection';
import { JobDescriptionSection } from './JobDescriptionSection';
import { IdealMatchingSection } from './IdealMatchingSection';
import { PipelineScreeningSection } from './PipelineScreeningSection';
// import { RecruitmentSettingsSection } from './RecruitmentSettingsSection';
import { CompensationScheduleSection } from './CompensationScheduleSection';
import type { VacancySectionProps } from './sectionProps';
import { vacancyFieldId, vacancyGroupId } from './vacancyFieldIds';
import { VacancyReview } from './VacancyReview';
import { VacancySectionCard } from './VacancySectionCard';
import { VacancyStepper, type StepState, type StepperStep } from './VacancyStepper';
import type { VacancyNoticeValue } from './VacancyNotice';

/**
 * The vacancy form, in every mode it is opened in (PB-011, PB-019, PB-021).
 *
 * <p>One component rather than a create form and an edit form. The sections,
 * validation, stepper, action bar and discard guard are the same work in every
 * mode, and two copies of a forty-field form drift the first time a field is
 * added to one of them. What differs between modes is small and declared
 * below: the heading, which buttons the action bar offers, and what Cancel
 * warns about.</p>
 *
 * <p>A step-by-step flow: one section at a time, Next and Back between them,
 * and a review of the whole vacancy before it goes out. Next will not leave a
 * section with missing or invalid answers, so by the review the vacancy is
 * publishable and the review is a read-through rather than an error hunt.</p>
 *
 * <p>Nothing has to be saved by hand. The work is kept in this browser as it
 * is typed, and as a server draft from the moment the server will accept one —
 * a new vacancy needs its pipeline template for that, which is chosen on the
 * sixth step. A live vacancy is never auto-saved: its saves go straight to the
 * candidate portal, so they wait for Save changes.</p>
 */

const SECTION_BODIES: Record<string, ComponentType<VacancySectionProps>> = {
  basics: BasicInformationSection,
  description: JobDescriptionSection,
  requirements: CandidateRequirementsSection,
  compensation: CompensationScheduleSection,
  pipeline: PipelineScreeningSection,
  matching: IdealMatchingSection,
  // recruitment: RecruitmentSettingsSection,
};

const HEADINGS: Record<VacancyFormMode, { title: string; subtitle: string }> = {
  create: {
    title: 'Create vacancy',
    subtitle: 'Seven short steps. We save as you go, so you can stop at any point and pick up where you left off.',
  },
  duplicate: {
    title: 'Duplicate vacancy',
    subtitle: 'A new vacancy, started from an existing one. Nothing goes live until you publish it.',
  },
  'edit-draft': {
    title: 'Edit draft',
    subtitle: 'Changes save as a draft as you go — only Publish puts it in front of candidates.',
  },
  'edit-published': {
    title: 'Edit vacancy',
    subtitle: 'Changes are checked in full before they are saved, because this vacancy is live.',
  },
};

type Submitting = null | 'publish' | 'save' | 'leave';

const REVIEW_INDEX = VACANCY_STEP_IDS.indexOf(REVIEW_STEP);

const smooth = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

export function VacancyForm({
  mode,
  initialValues,
  storageKey,
  banner,
  initialNotice = null,
  exitTo,
  exitLabel,
  creator = null,
  onSaveDraft,
  onPublish,
  onSaveChanges,
}: Readonly<{
  mode: VacancyFormMode;
  initialValues: JobVacancyFormValues;
  /** Where this vacancy's browser copy is kept; see {@link vacancyDraftStore}. */
  storageKey: string;
  /** Context above the form — where a duplicate came from, that a vacancy is live. */
  banner?: ReactNode;
  /** An outcome carried over from the page that sent us here. */
  initialNotice?: VacancyNoticeValue | null;
  /** Where Cancel and Back go. */
  exitTo: string;
  exitLabel: string;
  /** Who filed the vacancy ("You", or a name); for a new one, the person filling it in. */
  creator?: string | null;
  /**
   * An unvalidated save, which auto-save calls. Offered in every mode but
   * edit-published. A new vacancy's first one files it; the answer is how the
   * form learns the server now has it.
   */
  onSaveDraft?: (values: JobVacancyFormValues) => Promise<JobVacancyResponse | void>;
  /** Called after validation and confirmation. */
  onPublish?: (values: JobVacancyFormValues) => Promise<void>;
  /** A live vacancy's save — validated in full, no confirmation. */
  onSaveChanges?: (values: JobVacancyFormValues) => Promise<void>;
}>) {
  const navigate = useNavigate();
  const location = useLocation();

  // How the form behaves now. A new vacancy becomes a stored draft at its first
  // auto-save, and from then on is edited like one: its template is fixed.
  const [workingMode, setWorkingMode] = useState<VacancyFormMode>(mode);
  // For callbacks that must not be rebuilt when it changes.
  const workingModeRef = useRef(workingMode);
  useLayoutEffect(() => {
    workingModeRef.current = workingMode;
  }, [workingMode]);

  const [values, setValues] = useState<JobVacancyFormValues>(initialValues);
  // What "unsaved" is measured against. Moves forward on every successful
  // draft save, so Cancel after saving does not warn about work that is kept.
  const [baseline, setBaseline] = useState<JobVacancyFormValues>(initialValues);
  const [errors, setErrors] = useState<JobVacancyFieldErrors>({});
  const [submitting, setSubmitting] = useState<Submitting>(null);
  const [notice, setNotice] = useState<VacancyNoticeValue | null>(initialNotice);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  // Work kept in this browser from an earlier visit, waiting for Resume or Start over.
  const [resumable, setResumable] = useState<StoredVacancyDraft | null>(() => {
    const stored = vacancyDraftStore.read(storageKey);
    return stored && isVacancyDirty(stored.values, initialValues) ? stored : null;
  });

  const problems = useMemo(() => vacancyProblems(values, workingMode), [values, workingMode]);
  const reachable = furthestReachableStep(problems);

  const [step, setStep] = useState(() => {
    // Arriving from "Complete draft" opens the step that needs the work — or
    // the first one before it that is not finished, since Next stops there.
    const wanted = VACANCY_STEP_IDS.indexOf(location.hash.replace('#', ''));
    const open = furthestReachableStep(vacancyProblems(initialValues, mode));
    return wanted === -1 ? 0 : Math.min(wanted, open);
  });
  // The furthest step opened; behind it, finished steps show their tick.
  const [visited, setVisited] = useState(() =>
    mode === 'create' ? step : Math.max(step, furthestReachableStep(vacancyProblems(initialValues, mode))),
  );

  const stepId = VACANCY_STEP_IDS[step];
  const onReview = step === REVIEW_INDEX;
  const live = workingMode === 'edit-published';
  const editing = !createsVacancy(workingMode);

  const set = useCallback(
    <K extends JobVacancyField>(field: K, value: JobVacancyFormValues[K]) => {
      setNotice(null);
      setValues((current) => {
        const next = { ...current, [field]: value };
        // Only fields already flagged re-check as the form changes; nothing new
        // is flagged before Next or Publish. Every flagged field, not just this
        // one: some rules span two fields (manual below auto, a salary's minimum
        // below its maximum), and fixing either side must clear the message.
        setErrors((flagged) => {
          const keys = Object.keys(flagged) as JobVacancyField[];
          if (keys.length === 0) {
            return flagged;
          }
          const found = vacancyProblems(next, workingModeRef.current);
          const still: JobVacancyFieldErrors = {};
          for (const key of keys) {
            if (flagged[key] && found[key]) {
              still[key] = found[key];
            }
          }
          return still;
        });
        return next;
      });
    },
    [],
  );

  const { filled, total } = useMemo(() => formProgress(values, workingMode), [values, workingMode]);
  const errorSections = useMemo(() => sectionsWithErrors(errors), [errors]);

  /* --- Auto-save ---------------------------------------------------------- */

  const pipelineReady = Object.keys(validatePipeline(values, workingMode)).length === 0;
  const serverReady = Boolean(onSaveDraft) && !live && pipelineReady;

  const persist = useCallback(
    async (snapshot: JobVacancyFormValues) => {
      if (!onSaveDraft) {
        return;
      }
      const saved = await onSaveDraft(snapshot);
      setBaseline(snapshot);
      if (saved && createsVacancy(workingModeRef.current)) {
        // Filed. The server now holds the template, so the form treats it as fixed.
        setWorkingMode('edit-draft');
        setValues((current) => ({
          ...current,
          pipelineTemplateName: saved.pipelineTemplateName ?? current.pipelineTemplateName,
        }));
      }
    },
    [onSaveDraft],
  );

  const autosave = useVacancyAutosave({
    storageKey,
    values,
    step: stepId,
    initialValues,
    localEnabled: resumable === null,
    serverReady,
    // A new vacancy is filed on a step change, not mid-step: choosing a
    // template and pausing must not fix it before the recruiter moves on.
    idleSaves: editing,
    persist,
    describeError: (err) =>
      describeVacancyError(err, createsVacancy(workingModeRef.current) ? 'create' : 'save').message,
  });

  // A refused auto-save says why where it can be read, not only in the status
  // line; it goes away by itself once a later save gets through.
  const autosaveError = autosave.status.kind === 'error' ? autosave.status.message : null;

  function resume() {
    if (!resumable) {
      return;
    }
    const open = furthestReachableStep(vacancyProblems(resumable.values, workingMode));
    const target = Math.min(Math.max(VACANCY_STEP_IDS.indexOf(resumable.step), 0), open);
    setValues(resumable.values);
    setResumable(null);
    setVisited((furthest) => Math.max(furthest, target));
    setStep(target);
    setNotice({ tone: 'success', text: 'Picked up where you left off.' });
  }

  function startOver() {
    vacancyDraftStore.clear(storageKey);
    setResumable(null);
  }

  /* --- Moving between steps ----------------------------------------------- */

  const topRef = useRef<HTMLDivElement>(null);
  const headings = useRef<Record<string, HTMLHeadingElement | null>>({});
  // A field to land on once its step is on screen, instead of the step's heading.
  const pendingFocus = useRef<JobVacancyField | null>(null);
  const routeRef = useRef(location);
  useLayoutEffect(() => {
    routeRef.current = location;
  }, [location]);

  /** Puts the cursor on the first thing that needs fixing. */
  function focusField(field: JobVacancyField) {
    const direct = document.getElementById(vacancyFieldId(field));
    const target =
      direct ??
      document
        .getElementById(vacancyGroupId(field))
        ?.querySelector<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])');

    target?.scrollIntoView({ behavior: smooth(), block: 'center' });
    target?.focus({ preventScroll: true });
  }

  const arrived = useRef(false);
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      // A duplicate starts with the caret in the title it will want renaming.
      if (mode === 'duplicate' && step === 0) {
        document.getElementById(vacancyFieldId('title'))?.focus();
      }
      return;
    }
    // Each step opens at its top, with focus on its heading so the move is
    // announced — or on the field that sent us here.
    const field = pendingFocus.current;
    pendingFocus.current = null;
    if (field) {
      focusField(field);
    } else {
      topRef.current?.scrollIntoView({ behavior: smooth(), block: 'start' });
      headings.current[stepId]?.focus({ preventScroll: true });
    }
    // The step is part of the address, so a reload or a shared link opens it.
    const route = routeRef.current;
    navigate({ search: route.search, hash: `#${stepId}` }, { replace: true, state: route.state });
    // Only a step change moves focus; `mode` is fixed for the form's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function goTo(index: number) {
    if (index === step || index < 0 || index > reachable) {
      return;
    }
    setNotice((current) => (current?.tone === 'error' ? null : current));
    setVisited((furthest) => Math.max(furthest, index));
    setStep(index);
    // Moving on is the natural moment to keep the work.
    void autosave.saveNow();
  }

  function goNext() {
    const found = sectionProblems(problems, stepId);
    const first = firstInvalidField(found);
    if (first) {
      setErrors((flagged) => ({ ...flagged, ...found }));
      setNotice({ tone: 'error', text: 'Fill in the marked fields to continue.' });
      focusField(first);
      return;
    }
    goTo(step + 1);
  }

  /** Opens the step a field is asked in, and lands on the field. */
  function showField(field: JobVacancyField) {
    const index = VACANCY_STEP_IDS.indexOf(sectionOf(field)?.id ?? '');
    if (index === -1 || index === step) {
      focusField(field);
      return;
    }
    pendingFocus.current = field;
    setVisited((furthest) => Math.max(furthest, index));
    setStep(index);
  }

  function stateOf(index: number): StepState {
    const id = VACANCY_STEP_IDS[index];
    if (index === step) {
      return 'current';
    }
    if (errorSections.has(id)) {
      return 'error';
    }
    if (index > reachable) {
      return 'locked';
    }
    if (index !== REVIEW_INDEX && index <= visited && Object.keys(sectionProblems(problems, id)).length === 0) {
      return 'done';
    }
    return 'todo';
  }

  const steps: StepperStep[] = [
    ...VACANCY_SECTIONS.map((section) => ({
      id: section.id,
      index: section.index,
      title: section.title,
      hint: requiredFieldsOf(section, workingMode).length > 0 ? 'Required' : 'Optional',
    })),
    {
      id: REVIEW_STEP,
      index: String(REVIEW_INDEX + 1).padStart(2, '0'),
      title: live ? 'Review & save' : 'Review & publish',
      hint: 'Final check',
    },
  ];

  /* --- Actions ------------------------------------------------------------ */

  /** Runs every rule; on failure flags the fields and opens the first one. */
  function validates(): boolean {
    const found = vacancyProblems(values, workingMode);
    setErrors(found);
    const first = firstInvalidField(found);
    if (first) {
      setNotice({
        tone: 'error',
        text: 'Some details are still missing. The steps that need attention are marked above.',
      });
      showField(first);
      return false;
    }
    return true;
  }

  async function run(kind: Submitting, request: VacancyRequestKind, work: () => Promise<void>) {
    setSubmitting(kind);
    setNotice(null);
    try {
      await work();
      return true;
    } catch (err: unknown) {
      const plan = describeVacancyError(err, request);
      setNotice({ tone: plan.tone, text: plan.message });
      return false;
    } finally {
      setSubmitting(null);
    }
  }

  function requestPublish() {
    if (validates()) {
      setConfirmPublish(true);
    }
  }

  async function publish() {
    if (!onPublish) {
      return;
    }
    // Let a save already on its way land first, so the two never race on the version.
    await autosave.settle();
    const ok = await run('publish', createsVacancy(workingMode) ? 'create' : 'publish', () => onPublish(values));
    if (ok) {
      autosave.finish();
    } else {
      setConfirmPublish(false);
    }
  }

  async function saveChanges() {
    if (!onSaveChanges || !validates()) {
      return;
    }
    const ok = await run('save', 'save', () => onSaveChanges(values));
    if (ok) {
      autosave.finish();
    }
  }

  const unsaved = isVacancyDirty(values, baseline);

  function cancel() {
    if (!unsaved) {
      // An earlier visit's work, never resumed, stays for next time.
      if (resumable === null) {
        autosave.finish();
      }
      navigate(exitTo);
      return;
    }
    setConfirmCancel(true);
  }

  function discard() {
    autosave.finish();
    setConfirmCancel(false);
    navigate(exitTo);
  }

  async function keepAsDraft() {
    if (serverReady) {
      setSubmitting('leave');
      const ok = await autosave.saveNow();
      setSubmitting(null);
      if (!ok) {
        setConfirmCancel(false);
        return;
      }
    }
    // Without a template the draft is the browser copy, written on the way out.
    setConfirmCancel(false);
    navigate(exitTo);
  }

  let keepDescription: string;
  if (editing) {
    keepDescription =
      'Keep it as a draft to finish later — it stays in Vacancies. Discard drops the changes since it was last saved; the saved draft itself stays in Vacancies.';
  } else if (serverReady) {
    keepDescription =
      'Keep it as a draft to finish later — it will appear in Vacancies. Discard throws away everything you have entered.';
  } else {
    keepDescription =
      'Keep it as a draft and it waits in this browser — open the form again to pick up where you left off. Discard throws away everything you have entered.';
  }

  const busy = submitting !== null;
  const heading = HEADINGS[mode];
  const nextStep = steps[step + 1];

  return (
    <section>
      <PageHeader title={heading.title} subtitle={heading.subtitle}>
        <Button variant="ghost" icon={<ArrowLeftOutlined aria-hidden />} onClick={cancel}>
          {exitLabel}
        </Button>
      </PageHeader>

      <div className="mx-auto max-w-5xl">
        {creator && (
          <p className="-mt-2 mb-4 flex items-center gap-1.5 text-small text-slate-500">
            <UserOutlined aria-hidden className="text-[14px]" />
            Created by <span className="font-medium text-slate-700">{creator}</span>
          </p>
        )}

        <div ref={topRef} className="scroll-mt-24">
          <VacancyStepper
            steps={steps}
            current={step}
            stateOf={stateOf}
            onSelect={goTo}
            filled={filled}
            total={total}
          />
        </div>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (live) {
              void saveChanges();
            } else if (onReview) {
              requestPublish();
            }
          }}
        >
          {banner}

          {resumable && (
            <Alert tone="info" className="mb-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <span>
                  You have unsaved work on this vacancy from {formatRelativeTime(resumable.savedAt)}, kept in this
                  browser.
                </span>
                <span className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={startOver}>
                    Start over
                  </Button>
                  <Button variant="primary" size="sm" onClick={resume}>
                    Resume
                  </Button>
                </span>
              </div>
            </Alert>
          )}

          {autosaveError && (
            <Alert tone="error" className="mb-5">
              Your latest changes aren't saved as a draft yet. {autosaveError}
            </Alert>
          )}

          {notice && (
            <Alert tone={notice.tone} onDismiss={() => setNotice(null)} className="mb-5">
              {notice.text}
            </Alert>
          )}

          {/* Every section stays mounted and only the open one shows: what a
              section remembers on its own (a loaded template list, a search in
              progress) survives a trip to another step and back. */}
          {VACANCY_SECTIONS.map((section, index) => {
            const Body = SECTION_BODIES[section.id];
            const open = index === step;
            return (
              <div key={section.id} hidden={!open} className={open ? 'tp-step-panel' : undefined}>
                <VacancySectionCard
                  section={section}
                  progress={sectionProgress(values, section, requiredFieldsOf(section, workingMode))}
                  hasError={errorSections.has(section.id)}
                  headingRef={(element) => {
                    headings.current[section.id] = element;
                  }}
                >
                  <Body values={values} errors={errors} set={set} mode={workingMode} />
                </VacancySectionCard>
              </div>
            );
          })}

          {onReview && (
            <div className="tp-step-panel">
              <div className="mb-4 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary-50 text-primary-700"
                >
                  <FileSearchOutlined aria-hidden className="text-[16px]" />
                </span>
                <div className="min-w-0">
                  <h2
                    ref={(element) => {
                      headings.current[REVIEW_STEP] = element;
                    }}
                    tabIndex={-1}
                    className="m-0 text-title font-semibold tracking-heading text-slate-900 focus:outline-none"
                  >
                    {live ? 'Review & save' : 'Review & publish'}
                  </h2>
                  <Typography.Text type="secondary" className="text-small">
                    Every section, as candidates will read it. Use Edit to change anything.
                  </Typography.Text>
                </div>
              </div>
              <VacancyReview
                values={values}
                mode={workingMode}
                problems={problems}
                live={live}
                onEdit={(sectionId) => goTo(VACANCY_STEP_IDS.indexOf(sectionId))}
              />
            </div>
          )}

          {/* Sticky, not fixed: it rides the bottom of the viewport while the step is
              taller than the screen, then settles at the end of the column instead of
              hovering over the last inch of the page forever. The translucency is the
              same treatment the top bar uses, for the same reason — content passes
              underneath it. */}
          <div className="sticky bottom-0 z-15 mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white/92 px-4 py-3 shadow-md backdrop-blur-[10px]">
            {/* Cancel and the save status share a row of their own at phone width,
                so the step buttons stay together on the next. */}
            <div className="flex min-w-0 items-center gap-3 max-sm:basis-full">
              {/* Outlined, not a text button: beside the save status a bare "Cancel"
                  read as a label rather than something to press. */}
              <Button variant="secondary" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
              <AutosaveStatus status={autosave.status} onRetry={() => void autosave.saveNow()} />
            </div>
            {/* One group pushed right by an auto margin, not a flex spacer — a
                spacer is itself a flex item, and at phone width it claimed the
                row and pushed the buttons onto a third one. */}
            <div className="ms-auto flex flex-wrap gap-2">
              {step > 0 && (
                <Button
                  variant="secondary"
                  icon={<ArrowLeftOutlined aria-hidden />}
                  onClick={() => goTo(step - 1)}
                  disabled={busy}
                >
                  Back
                </Button>
              )}
              {!onReview && (
                <Button variant={live ? 'secondary' : 'primary'} onClick={goNext} disabled={busy}>
                  <span>
                    Next<span className="max-sm:hidden">: {nextStep?.title}</span>
                  </span>
                  <ArrowRightOutlined aria-hidden />
                </Button>
              )}
              {live ? (
                <Button type="submit" variant="primary" loading={submitting === 'save'} disabled={busy}>
                  Save changes
                </Button>
              ) : (
                onReview && (
                  <Button type="submit" variant="primary" disabled={busy}>
                    Publish vacancy
                  </Button>
                )
              )}
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        tone="primary"
        title="Publish this vacancy?"
        description={
          <>
            <Typography.Text strong>{values.title.trim() || 'This vacancy'}</Typography.Text> will
            appear on the candidate portal and start accepting applications
            {values.applicationDeadline ? (
              <>
                {' '}
                until <Typography.Text strong>{formatDate(values.applicationDeadline)}</Typography.Text>
              </>
            ) : null}
            .
          </>
        }
        confirmLabel="Publish vacancy"
        busyLabel="Publishing…"
        busy={submitting === 'publish'}
        fallbackFocusId={vacancyFieldId('title')}
        onConfirm={() => void publish()}
        onCancel={() => setConfirmPublish(false)}
      />

      {live ? (
        <ConfirmDialog
          open={confirmCancel}
          title="Discard your changes?"
          description="Edits you have made since the last save will not be kept."
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          fallbackFocusId={vacancyFieldId('title')}
          onConfirm={discard}
          onCancel={() => setConfirmCancel(false)}
        />
      ) : (
        <ConfirmDialog
          open={confirmCancel}
          tone="primary"
          title="Leave this vacancy?"
          description={keepDescription}
          confirmLabel="Keep as draft"
          busyLabel="Saving draft…"
          cancelLabel="Keep editing"
          busy={submitting === 'leave'}
          extraAction={{ label: 'Discard', variant: 'danger', onClick: discard }}
          fallbackFocusId={vacancyFieldId('title')}
          onConfirm={() => void keepAsDraft()}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </section>
  );
}

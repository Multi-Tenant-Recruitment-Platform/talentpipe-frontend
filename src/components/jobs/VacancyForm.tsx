import { Flex, Typography } from 'antd';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  firstInvalidField,
  isVacancyDirty,
  REQUIRED_TOTAL,
  requiredFilled,
  sectionProgress,
  sectionsWithErrors,
  VACANCY_SECTIONS,
  validateVacancy,
  type JobVacancyField,
  type JobVacancyFieldErrors,
  type JobVacancyFormValues,
} from '../../dashboard/jobVacancy';
import { describeVacancyError, type VacancyRequestKind } from '../../dashboard/vacancyErrors';
import { fontSize, space } from '../../theme/tokens';
import { formatDate } from '../../utils/format';
import { PageHeader } from '../dashboard/PageHeader';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BasicInformationSection } from './BasicInformationSection';
import { CandidateRequirementsSection } from './CandidateRequirementsSection';
import { JobDescriptionSection } from './JobDescriptionSection';
// import { RecruitmentSettingsSection } from './RecruitmentSettingsSection';
import { SalaryBenefitsSection } from './SalaryBenefitsSection';
import type { VacancySectionProps } from './sectionProps';
import { vacancyFieldId, vacancyGroupId } from './vacancyFieldIds';
import { VacancySectionCard } from './VacancySectionCard';
import { VacancySectionRail } from './VacancySectionRail';
import { WorkScheduleSection } from './WorkScheduleSection';
import type { VacancyNoticeValue } from './VacancyNotice';

/**
 * The vacancy form, in every mode it is opened in (PB-011, PB-019, PB-021).
 *
 * <p>One component rather than a create form and an edit form. The sections,
 * validation, rail, sticky action bar and discard guard are the same work in
 * every mode, and two copies of a forty-field form drift the first time a field
 * is added to one of them. What differs between modes is small and declared
 * below: the heading, which buttons the action bar offers, and what Cancel
 * warns about.</p>
 *
 * <p>One scrollable page rather than a six-step wizard. A wizard gates progress
 * behind Next, which is the wrong shape for this task twice over: the sections
 * are independent, so there is no order to enforce, and Save Draft has to work
 * from anywhere — a draft that can only be saved once the form is complete is
 * not a draft.</p>
 *
 * <p>Validation runs on Publish (or Save, for a live vacancy) and never on
 * keystroke. Once a field has been flagged it re-validates as it is corrected,
 * which is the moment the feedback helps.</p>
 */

export type VacancyFormMode = 'create' | 'duplicate' | 'edit-draft' | 'edit-published';

const SECTION_BODIES: Record<string, ComponentType<VacancySectionProps>> = {
  basics: BasicInformationSection,
  description: JobDescriptionSection,
  requirements: CandidateRequirementsSection,
  salary: SalaryBenefitsSection,
  schedule: WorkScheduleSection,
  // recruitment: RecruitmentSettingsSection,
};

const HEADINGS: Record<VacancyFormMode, { title: string; subtitle: string }> = {
  create: {
    title: 'Create vacancy',
    subtitle: 'Five sections. Only the marked fields are needed to publish — the rest can follow.',
  },
  duplicate: {
    title: 'Duplicate vacancy',
    subtitle: 'A new vacancy, started from an existing one. Nothing goes live until you publish it.',
  },
  'edit-draft': {
    title: 'Edit draft',
    subtitle: 'Save as often as you like — only Publish puts it in front of candidates.',
  },
  'edit-published': {
    title: 'Edit vacancy',
    subtitle: 'Changes are checked in full before they are saved, because this vacancy is live.',
  },
};

type Submitting = null | 'draft' | 'publish' | 'save';

export function VacancyForm({
  mode,
  initialValues,
  banner,
  initialNotice = null,
  exitTo,
  exitLabel,
  onSaveDraft,
  onPublish,
  onSaveChanges,
}: Readonly<{
  mode: VacancyFormMode;
  initialValues: JobVacancyFormValues;
  /** Context above the form — where a duplicate came from, that a vacancy is live. */
  banner?: ReactNode;
  /** An outcome carried over from the page that sent us here. */
  initialNotice?: VacancyNoticeValue | null;
  /** Where Cancel and Back go. */
  exitTo: string;
  exitLabel: string;
  /** Unvalidated save. Offered in every mode but edit-published. */
  onSaveDraft?: (values: JobVacancyFormValues) => Promise<void>;
  /** Called after validation and confirmation. */
  onPublish?: (values: JobVacancyFormValues) => Promise<void>;
  /** A live vacancy's save — validated in full, no confirmation. */
  onSaveChanges?: (values: JobVacancyFormValues) => Promise<void>;
}>) {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const editing = mode === 'edit-draft' || mode === 'edit-published';

  const [values, setValues] = useState<JobVacancyFormValues>(initialValues);
  // What "unsaved" is measured against. Moves forward on every successful
  // draft save, so Cancel after saving does not warn about work that is kept.
  const [baseline, setBaseline] = useState<JobVacancyFormValues>(initialValues);
  const [errors, setErrors] = useState<JobVacancyFieldErrors>({});
  const [submitting, setSubmitting] = useState<Submitting>(null);
  const [notice, setNotice] = useState<VacancyNoticeValue | null>(initialNotice);
  const [activeSection, setActiveSection] = useState(VACANCY_SECTIONS[0].id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const dirty = isVacancyDirty(values, baseline);

  const set = useCallback(
    <K extends JobVacancyField>(field: K, value: JobVacancyFormValues[K]) => {
      setNotice(null);
      setValues((current) => {
        const next = { ...current, [field]: value };
        // Only a field already flagged re-checks as it is typed; everything
        // else waits for Publish.
        setErrors((flagged) =>
          flagged[field] ? { ...flagged, [field]: validateVacancy(next)[field] } : flagged,
        );
        return next;
      });
    },
    [],
  );

  const progressFor = useCallback(
    (sectionId: string) => {
      const section = VACANCY_SECTIONS.find((entry) => entry.id === sectionId);
      return sectionProgress(values, section ?? VACANCY_SECTIONS[0]);
    },
    [values],
  );

  const filled = useMemo(() => requiredFilled(values), [values]);
  const errorSections = useMemo(() => sectionsWithErrors(errors), [errors]);

  /* --- Wayfinding -------------------------------------------------------- */

  const visible = useRef(new Set<string>());

  useEffect(() => {
    const elements = VACANCY_SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => element !== null,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.current.add(entry.target.id);
          } else {
            visible.current.delete(entry.target.id);
          }
        }
        // The topmost section inside the band is the one being read; document
        // order rather than intersection ratio, so a long section does not lose
        // the rail to the short one below it.
        const current = VACANCY_SECTIONS.find((section) => visible.current.has(section.id));
        if (current) {
          setActiveSection(current.id);
        }
      },
      // A band just under the sticky top bar: a section counts as current from
      // the moment its heading clears the chrome.
      { rootMargin: '-80px 0px -55% 0px' },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const smooth = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  const jumpTo = useCallback((sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: smooth(), block: 'start' });
    setActiveSection(sectionId);
  }, []);

  // Arriving from "Complete draft" lands on the section that needs the work,
  // and a duplicate starts with the caret in the title it will want renaming.
  useEffect(() => {
    const target = hash.replace('#', '');
    if (VACANCY_SECTIONS.some((section) => section.id === target)) {
      // Scroll only; the observer above marks the rail once the section is in view.
      document.getElementById(target)?.scrollIntoView({ behavior: smooth(), block: 'start' });
    } else if (mode === 'duplicate') {
      document.getElementById(vacancyFieldId('title'))?.focus();
    }
    // Once, on arrival — a later hash change is the rail's business.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /** Runs every rule; on failure flags the fields and lands on the first one. */
  function validates(): boolean {
    const found = validateVacancy(values);
    setErrors(found);
    const first = firstInvalidField(found);
    if (first) {
      setNotice({
        tone: 'error',
        text: 'Some details are still missing. The sections that need attention are marked in the list beside the form.',
      });
      focusField(first);
      return false;
    }
    return true;
  }

  /* --- Actions ----------------------------------------------------------- */

  const fresh = mode === 'create' || mode === 'duplicate';

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

  async function saveDraft() {
    if (!onSaveDraft) {
      return;
    }
    // Deliberately unvalidated. A draft is a partial vacancy by definition,
    // and refusing to keep it because it is incomplete would defeat the point
    // of the button.
    const snapshot = values;
    const saved = await run('draft', fresh ? 'create' : 'save', () => onSaveDraft(snapshot));
    if (saved && editing) {
      setBaseline(snapshot);
      setNotice({ tone: 'success', text: 'Draft saved. Only your team can see it until you publish.' });
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
    const ok = await run('publish', fresh ? 'create' : 'publish', () => onPublish(values));
    if (!ok) {
      setConfirmPublish(false);
    }
  }

  async function saveChanges() {
    if (!onSaveChanges || !validates()) {
      return;
    }
    await run('save', 'save', () => onSaveChanges(values));
  }

  function cancel() {
    if (dirty) {
      setConfirmCancel(true);
      return;
    }
    navigate(exitTo);
  }

  const busy = submitting !== null;
  const live = mode === 'edit-published';
  const heading = HEADINGS[mode];

  return (
    <section>
      <PageHeader title={heading.title} subtitle={heading.subtitle}>
        <Button variant="ghost" onClick={cancel}>
          {exitLabel}
        </Button>
      </PageHeader>

      <div className="tp-vacancy-layout">
        <VacancySectionRail
          activeId={activeSection}
          progressFor={progressFor}
          errorSections={errorSections}
          onJump={jumpTo}
        />

        <form
          className="tp-vacancy-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (live) {
              void saveChanges();
            } else {
              requestPublish();
            }
          }}
        >
          {banner}

          {notice && (
            <Alert tone={notice.tone} onDismiss={() => setNotice(null)} style={{ marginBottom: space[2.5] }}>
              {notice.text}
            </Alert>
          )}

          <Flex vertical gap={space[2.5]}>
            {VACANCY_SECTIONS.map((section) => {
              const Body = SECTION_BODIES[section.id];
              return (
                <VacancySectionCard
                  key={section.id}
                  section={section}
                  progress={sectionProgress(values, section)}
                  hasError={errorSections.has(section.id)}
                >
                  <Body values={values} errors={errors} set={set} />
                </VacancySectionCard>
              );
            })}
          </Flex>

          {/* Sticky rather than fixed: it rides the bottom of the viewport
              while the form is long, then settles at the end of the column
              instead of hovering over the page's last inch forever. */}
          <div className="tp-vacancy-actions">
            <Typography.Text type="secondary" style={{ fontSize: fontSize.small }}>
              {filled} of {REQUIRED_TOTAL} required fields complete
            </Typography.Text>
            {/* One group pushed right by an auto margin, not a flex spacer — a
                spacer is itself a flex item, and at phone width it claimed the
                row and pushed the buttons onto a third one. */}
            <div className="tp-vacancy-action-group">
              <Button variant="ghost" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
              {live ? (
                <Button type="submit" variant="primary" loading={submitting === 'save'} disabled={busy}>
                  Save changes
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => void saveDraft()}
                    loading={submitting === 'draft'}
                    disabled={busy}
                  >
                    Save draft
                  </Button>
                  <Button type="submit" variant="primary" disabled={busy}>
                    Publish vacancy
                  </Button>
                </>
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

      <ConfirmDialog
        open={confirmCancel}
        title={editing ? 'Discard your changes?' : 'Discard this vacancy?'}
        description={
          editing
            ? 'Edits you have made since the last save will not be kept.'
            : 'Nothing you have entered will be kept. Save it as a draft instead if you want to come back to it.'
        }
        confirmLabel={editing ? 'Discard changes' : 'Discard'}
        cancelLabel="Keep editing"
        fallbackFocusId={vacancyFieldId('title')}
        onConfirm={() => {
          setConfirmCancel(false);
          navigate(exitTo);
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </section>
  );
}

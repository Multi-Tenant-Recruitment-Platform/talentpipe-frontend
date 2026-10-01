import { Flex, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { BasicInformationSection } from '../../components/jobs/BasicInformationSection';
import { CandidateRequirementsSection } from '../../components/jobs/CandidateRequirementsSection';
import { JobDescriptionSection } from '../../components/jobs/JobDescriptionSection';
import { RecruitmentSettingsSection } from '../../components/jobs/RecruitmentSettingsSection';
import { SalaryBenefitsSection } from '../../components/jobs/SalaryBenefitsSection';
import { vacancyFieldId, vacancyGroupId } from '../../components/jobs/vacancyFieldIds';
import { VacancySectionCard } from '../../components/jobs/VacancySectionCard';
import { VacancySectionRail } from '../../components/jobs/VacancySectionRail';
import { WorkScheduleSection } from '../../components/jobs/WorkScheduleSection';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  EMPTY_VACANCY_VALUES,
  firstInvalidField,
  isVacancyDirty,
  sectionProgress,
  sectionsWithErrors,
  VACANCY_SECTIONS,
  validateVacancy,
  type JobVacancyField,
  type JobVacancyFieldErrors,
  type JobVacancyFormValues,
} from '../../dashboard/jobVacancy';
import { useJobVacancies } from '../../dashboard/useJobVacancies';
import { fontSize, space } from '../../theme/tokens';
import type { VacancySectionProps } from '../../components/jobs/sectionProps';

/**
 * Open a role (PB-011).
 *
 * <p>One scrollable page rather than a six-step wizard. A wizard gates progress
 * behind Next, which is the wrong shape for this task twice over: the sections
 * are independent, so there is no order to enforce, and Save Draft has to work
 * from anywhere — a draft that can only be saved once the form is complete is
 * not a draft. The rail beside the form carries what the wizard's step counter
 * would have: where you are, what is answered, and how much is left.</p>
 *
 * <p>Validation runs on Create and never on keystroke. A required field is
 * empty for every character typed before the last one, and turning it red while
 * someone is still filling it in is noise. Once a field has been flagged it
 * re-validates as it is corrected, which is the moment the feedback helps.</p>
 */

/** Each section's body, keyed by the id the spine gives it. */
const SECTION_BODIES: Record<string, ComponentType<VacancySectionProps>> = {
  basics: BasicInformationSection,
  description: JobDescriptionSection,
  requirements: CandidateRequirementsSection,
  salary: SalaryBenefitsSection,
  schedule: WorkScheduleSection,
  recruitment: RecruitmentSettingsSection,
};

/** Required fields across the whole form — the denominator in the action bar. */
const REQUIRED_TOTAL = VACANCY_SECTIONS.reduce(
  (count, section) => count + section.required.length,
  0,
);

export function CreateJobVacancyPage() {
  const navigate = useNavigate();
  const { create } = useJobVacancies();

  const [values, setValues] = useState<JobVacancyFormValues>(EMPTY_VACANCY_VALUES);
  const [errors, setErrors] = useState<JobVacancyFieldErrors>({});
  const [submitting, setSubmitting] = useState<null | 'draft' | 'publish'>(null);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState(VACANCY_SECTIONS[0].id);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const dirty = isVacancyDirty(values);

  const set = useCallback(
    <K extends JobVacancyField>(field: K, value: JobVacancyFormValues[K]) => {
      setNotice(null);
      setValues((current) => {
        const next = { ...current, [field]: value };
        // Only a field already flagged re-checks as it is typed; everything
        // else waits for Create.
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

  const requiredFilled = useMemo(
    () =>
      VACANCY_SECTIONS.reduce((count, section) => count + sectionProgress(values, section).filled, 0),
    [values],
  );

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

  /* --- Actions ----------------------------------------------------------- */

  async function saveDraft() {
    setSubmitting('draft');
    setNotice(null);
    try {
      // Deliberately unvalidated. A draft is a partial vacancy by definition,
      // and refusing to keep it because it is incomplete would defeat the point
      // of the button.
      await create(values, 'DRAFT');
      setNotice({ tone: 'success', text: 'Draft saved. You can pick this up again from Job Vacancies.' });
    } finally {
      setSubmitting(null);
    }
  }

  async function createVacancy() {
    const found = validateVacancy(values);
    setErrors(found);

    const first = firstInvalidField(found);
    if (first) {
      setNotice({
        tone: 'error',
        text: 'Some details are still missing. The sections that need attention are marked in the list beside the form.',
      });
      focusField(first);
      return;
    }

    setSubmitting('publish');
    try {
      await create(values, 'PUBLISHED');
      navigate('/dashboard/jobs', { replace: true });
    } finally {
      setSubmitting(null);
    }
  }

  function cancel() {
    if (dirty) {
      setConfirmCancel(true);
      return;
    }
    navigate('/dashboard/jobs');
  }

  const busy = submitting !== null;

  return (
    <section>
      <PageHeader
        title="Create vacancy"
        subtitle="Six sections. Only the marked fields are needed to publish — the rest can follow."
      >
        <Button variant="ghost" onClick={cancel}>
          Back to vacancies
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
            void createVacancy();
          }}
        >
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
              {requiredFilled} of {REQUIRED_TOTAL} required fields complete
            </Typography.Text>
            {/* The three controls are one group pushed to the right by an auto
                margin, not by a flex spacer — a spacer is itself a flex item, so
                at phone width it claimed the row and pushed the buttons onto a
                third one. */}
            <div className="tp-vacancy-action-group">
              <Button variant="ghost" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => void saveDraft()}
                loading={submitting === 'draft'}
                disabled={busy}
              >
                Save draft
              </Button>
              <Button type="submit" variant="primary" loading={submitting === 'publish'} disabled={busy}>
                Create vacancy
              </Button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Discard this vacancy?"
        description="Nothing you have entered will be kept. Save it as a draft instead if you want to come back to it."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setConfirmCancel(false);
          navigate('/dashboard/jobs');
        }}
        onCancel={() => setConfirmCancel(false)}
      />
    </section>
  );
}

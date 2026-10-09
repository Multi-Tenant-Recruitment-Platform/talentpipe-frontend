import { Card as AntCard, Col, Flex, Input, Row, Skeleton } from 'antd';
import axios from 'axios';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { candidatesApi } from '../api/candidates';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  blankProfileFor,
  buildCandidatePayload,
  CANDIDATE_TEXT_FIELDS,
  displayedCv,
  EMPTY_CANDIDATE_FORM,
  isProfileDirty,
  leavingTalentPool,
  MAX_ID_NUMBER_LENGTH,
  PROFILE_FOCUS_IDS,
  profileChecklist,
  profileStrength,
  removeCv,
  toCandidateFormState,
  validateCandidateValues,
  validateCvFile,
  validatePhotoFile,
  type CandidateFormState,
  type CandidateTextField,
  type ChecklistTarget,
} from '../candidate/candidateProfile';
import { CandidateCvUpload } from '../components/candidate/CandidateCvUpload';
import { CandidateProfileHero } from '../components/candidate/CandidateProfileHero';
import { CandidateTalentPool } from '../components/candidate/CandidateTalentPool';
import { ProfileChecklist } from '../components/candidate/ProfileChecklist';
import { ProfileSection } from '../components/candidate/ProfileSection';
import { Icon, type IconName } from '../components/dashboard/Icon';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { readFileAsDataUrl } from '../dashboard/companyImages';

/**
 * My profile — the signed-in candidate's own details, ID number, photo and CV.
 *
 * <p>All form state is one {@link CandidateFormState} held here, beside the
 * `baseline` it was loaded or last saved as; the rules about both live in
 * `candidate/candidateProfile`. Files are staged in that state and leave only
 * with Save, so Discard — which puts the baseline back — never touches the
 * stored profile.</p>
 *
 * <p>Errors show on blur or on submit, never while typing; once shown, a field
 * re-checks as it is corrected.</p>
 */

const FIELDS: Record<
  CandidateTextField,
  { label: string; icon: IconName; optional?: boolean; hint?: string }
> = {
  fullName: { label: 'Full name', icon: 'user' },
  identityCardNumber: {
    label: 'ID number',
    icon: 'identification',
    hint: 'Your national identity card (NIC) or passport number.',
  },
  email: { label: 'Email', icon: 'envelope' },
  phone: { label: 'Phone number', icon: 'phone', optional: true },
};

const fieldId = (field: CandidateTextField) => `candidate-${field}`;
const errorId = (field: CandidateTextField) => `candidate-${field}-error`;
const hintId = (field: CandidateTextField) => `candidate-${field}-hint`;

function Field({ field, error, children }: Readonly<{ field: CandidateTextField; error?: string; children: ReactNode }>) {
  const { label, optional, hint } = FIELDS[field];
  return (
    <div>
      <label htmlFor={fieldId(field)} className="tp-profile-label">
        {label}
        {optional && <span className="tp-profile-label-optional"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId(field)} role="alert" className="tp-profile-field-error">
          <Icon name="warning" size={14} style={{ marginTop: 1 }} />
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId(field)} className="tp-profile-field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <Flex vertical gap={24} aria-busy="true">
      <output className="sr-only">Loading your profile…</output>
      <div className="tp-profile-hero" aria-hidden="true">
        <Skeleton avatar={{ size: 96 }} active title={{ width: '40%' }} paragraph={{ rows: 2 }} />
      </div>
      <AntCard>
        <Skeleton active paragraph={{ rows: 4 }} />
      </AntCard>
    </Flex>
  );
}

const isNotFound = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 404;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function CandidateProfilePage() {
  const { user } = useAuth();

  const [form, setForm] = useState<CandidateFormState>(EMPTY_CANDIDATE_FORM);
  // What Discard returns to and "unsaved changes" is measured against.
  const [baseline, setBaseline] = useState<CandidateFormState>(EMPTY_CANDIDATE_FORM);
  // No stored profile yet: the first save is the one that creates it.
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped by "Try again" to re-run the load.
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [touched, setTouched] = useState<ReadonlySet<CandidateTextField>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Each photo read gets a ticket, so a slow read can't overwrite a newer pick.
  const photoTicket = useRef(0);

  // Taken once: the account details only seed a profile that does not exist
  // yet. The route waits for the session, so the user is already known here.
  const [account] = useState(user);

  useEffect(() => {
    let current = true;
    const start = (state: CandidateFormState, fresh: boolean) => {
      setForm(state);
      setBaseline(state);
      setIsNew(fresh);
      setLoadError(null);
      setLoading(false);
    };
    candidatesApi.getMine().then(
      (profile) => current && start(toCandidateFormState(profile), false),
      (err: unknown) => {
        if (!current) {
          return;
        }
        if (isNotFound(err)) {
          start(blankProfileFor(account), true);
        } else {
          setLoadError(apiErrorMessage(err, "Your profile couldn't be loaded. Check your connection and try again."));
          setLoading(false);
        }
      },
    );
    return () => {
      current = false;
    };
  }, [account, loadAttempt]);

  const errors = validateCandidateValues(form.values);
  const visibleError = (field: CandidateTextField) =>
    submitted || touched.has(field) ? errors[field] : undefined;

  /** Everything a text field needs, wired to the one form state. */
  const fieldProps = (field: CandidateTextField) => {
    const error = visibleError(field);
    const describedBy = error ? errorId(field) : FIELDS[field].hint && hintId(field);
    return {
      id: fieldId(field),
      value: form.values[field],
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setForm((current) => ({ ...current, values: { ...current.values, [field]: value } }));
      },
      onBlur: () => setTouched((current) => (current.has(field) ? current : new Set(current).add(field))),
      disabled: saving,
      prefix: <Icon name={FIELDS[field].icon} size={16} style={{ color: 'var(--tp-slate-400)' }} />,
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      ...(error ? { status: 'error' as const, 'aria-invalid': true } : {}),
    };
  };

  function resetTransientState() {
    photoTicket.current++;
    setPhotoPreview(null);
    setPhotoError(null);
    setCvError(null);
    setTouched(new Set());
    setSubmitted(false);
  }

  function pickPhoto(file: File) {
    const problem = validatePhotoFile(file);
    setPhotoError(problem);
    if (problem) {
      return;
    }
    setForm((current) => ({ ...current, photoFile: file, removePhoto: false }));
    const ticket = ++photoTicket.current;
    readFileAsDataUrl(file).then(
      (url) => ticket === photoTicket.current && setPhotoPreview(url),
      (err: Error) => ticket === photoTicket.current && setPhotoError(err.message),
    );
  }

  function removePhoto() {
    photoTicket.current++;
    setPhotoPreview(null);
    setPhotoError(null);
    setForm((current) => ({ ...current, photoFile: null, removePhoto: current.existingPhotoUrl !== null }));
  }

  function pickCv(file: File) {
    const problem = validateCvFile(file);
    // A rejected file never replaces a good one already staged.
    setCvError(problem);
    if (!problem) {
      setForm((current) => ({ ...current, cvFile: file }));
    }
  }

  /** Takes a checklist item to the control that finishes it. */
  function jumpTo(target: ChecklistTarget) {
    let id: string;
    if (target === 'photo') {
      id = PROFILE_FOCUS_IDS.photo;
    } else if (target === 'talentPool') {
      id = PROFILE_FOCUS_IDS.talentPool;
    } else if (target === 'cv') {
      // The CV lives under the Talent Pool choice; until that is made, the
      // checkbox is the next step.
      id = form.addToTalentPool ? PROFILE_FOCUS_IDS.cvDropzone : PROFILE_FOCUS_IDS.talentPool;
    } else {
      id = fieldId(target);
    }
    const element = document.getElementById(id);
    element?.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    element?.focus({ preventScroll: true });
  }

  function discardChanges() {
    setForm(baseline);
    resetTransientState();
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) {
      return;
    }
    setSubmitted(true);
    const firstBroken = CANDIDATE_TEXT_FIELDS.find((field) => errors[field]);
    if (firstBroken) {
      document.getElementById(fieldId(firstBroken))?.focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const saved = toCandidateFormState(await candidatesApi.saveMine(buildCandidatePayload(form)));
      // Start over from what the server now holds.
      setForm(saved);
      setBaseline(saved);
      setIsNew(false);
      resetTransientState();
      setNotice('Profile saved.');
    } catch (err) {
      // Everything typed and picked stays put, ready for another go.
      setSaveError(apiErrorMessage(err, "Your profile couldn't be saved. Check your connection and try again."));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="tp-profile-page">
        <ProfileSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="tp-profile-page">
        <Alert tone="error">
          <Flex wrap align="center" justify="space-between" gap={12}>
            <span>{loadError}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setLoading(true);
                setLoadAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </Flex>
        </Alert>
      </div>
    );
  }

  const checklist = profileChecklist(form);
  const strength = profileStrength(checklist);
  const doneCount = checklist.filter((item) => item.done).length;
  const dirty = isProfileDirty(baseline, form);
  const pendingRemovalName =
    form.removeExistingCv && form.existingCv && !form.cvFile ? form.existingCv.name : null;

  let saveState: { tone: 'dirty' | 'new' | 'saved'; text: string };
  if (dirty) {
    saveState = { tone: 'dirty', text: 'You have unsaved changes.' };
  } else if (isNew) {
    saveState = { tone: 'new', text: "Your profile hasn't been saved yet." };
  } else {
    saveState = { tone: 'saved', text: 'All changes saved.' };
  }

  return (
    <div className="tp-profile-page">
      <CandidateProfileHero
        name={form.values.fullName}
        email={form.values.email}
        idNumber={form.values.identityCardNumber}
        inTalentPool={baseline.wasInTalentPool}
        photoUrl={photoPreview ?? (form.removePhoto ? null : form.existingPhotoUrl)}
        photoError={photoError}
        strength={strength}
        doneCount={doneCount}
        totalCount={checklist.length}
        disabled={saving}
        onPickPhoto={pickPhoto}
        onRemovePhoto={removePhoto}
      />

      {notice && (
        <Alert tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <div className="tp-profile-grid">
        <form onSubmit={handleSubmit} noValidate className="tp-profile-main">
          <ProfileSection
            id="profile-personal"
            icon="user"
            title="Personal information"
            subtitle="How companies identify and contact you."
          >
            <Row gutter={[20, 20]}>
              <Col xs={24} sm={12}>
                <Field field="fullName" error={visibleError('fullName')}>
                  <Input {...fieldProps('fullName')} autoComplete="name" required />
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field field="identityCardNumber" error={visibleError('identityCardNumber')}>
                  <Input
                    {...fieldProps('identityCardNumber')}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={MAX_ID_NUMBER_LENGTH}
                    required
                    placeholder="200012345678"
                  />
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field field="email" error={visibleError('email')}>
                  <Input
                    {...fieldProps('email')}
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    required
                    placeholder="name@example.com"
                  />
                </Field>
              </Col>
              <Col xs={24} sm={12}>
                <Field field="phone" error={visibleError('phone')}>
                  <Input {...fieldProps('phone')} type="tel" autoComplete="tel" placeholder="+94 77 123 4567" />
                </Field>
              </Col>
            </Row>
          </ProfileSection>

          <ProfileSection
            id="profile-talent-pool"
            icon="briefcase"
            title="Talent Pool"
            subtitle="Optional. Be considered for roles beyond the ones you apply to."
          >
            <CandidateTalentPool
              checked={form.addToTalentPool}
              leavingPool={leavingTalentPool(form)}
              disabled={saving}
              onToggle={(next) => setForm((current) => ({ ...current, addToTalentPool: next }))}
            >
              <CandidateCvUpload
                cv={displayedCv(form)}
                pendingRemovalName={pendingRemovalName}
                error={cvError}
                disabled={saving}
                onPick={pickCv}
                onRemove={() => {
                  setCvError(null);
                  setForm(removeCv);
                }}
                onUndoRemove={() => setForm((current) => ({ ...current, removeExistingCv: false }))}
              />
            </CandidateTalentPool>
          </ProfileSection>

          {saveError && <Alert tone="error">{saveError}</Alert>}

          {/* Sticks to the bottom of the viewport while the form scrolls, so
              Save is always one move away and the state is always visible. */}
          <div className="tp-profile-savebar">
            <p className="tp-profile-savebar-status" data-state={saveState.tone}>
              <span className="tp-profile-savebar-dot" aria-hidden="true" />
              {saveState.text}
            </p>
            <div className="tp-profile-savebar-actions">
              {dirty && (
                <Button variant="ghost" disabled={saving} onClick={discardChanges}>
                  Discard changes
                </Button>
              )}
              <Button type="submit" variant="primary" loading={saving} disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </div>
        </form>

        <aside className="tp-profile-aside" aria-label="Profile progress">
          <ProfileChecklist items={checklist} strength={strength} onJump={jumpTo} />
        </aside>
      </div>
    </div>
  );
}

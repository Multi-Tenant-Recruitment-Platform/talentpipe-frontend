import { useCallback, useEffect, useState } from 'react';
import { companyApi } from '../api/company';
import type { CompanyImageKind, CompanyProfileResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useCan } from '../auth/useCan';
import type { AlertTone } from '../components/ui/Alert';
import { resolveTenantHost } from '../tenant/subdomain';
import { readFileAsDataUrl, validateImageFile } from './companyImages';
import { describeCompanyError } from './companyErrors';
import {
  EMPTY_FORM_VALUES,
  isDirty,
  toFormValues,
  toUpdateRequest,
  validateCompanyProfile,
  type CompanyFieldErrors,
  type CompanyFormValues,
  type CompanyListField,
  type CompanyTextField,
} from './companyProfile';

/**
 * One company profile, loaded and edited.
 *
 * <p>Both surfaces that manage the profile — the Profile Management page and
 * the Company Settings card — run on this hook. Without it the two would each
 * grow their own copy of load / validate / stage-an-image / save, and the
 * copies would drift the first time a rule changed. The pages are left with
 * layout, which is the only thing that actually differs between them.</p>
 */

export interface ProfileMessage {
  tone: AlertTone;
  text: string;
}

/** An image chosen in the browser but not yet sent anywhere. */
interface StagedImage {
  file: File;
  /** Data URL for the preview, so the admin sees it before committing. */
  preview: string;
}

/** Per-kind staging state: a new file, a pending removal, or neither. */
type ImageStaging = Record<CompanyImageKind, StagedImage | null>;
type ImageRemoved = Record<CompanyImageKind, boolean>;
type ImageErrors = Record<CompanyImageKind, string | null>;

const NO_STAGING: ImageStaging = { logo: null, cover: null };
const NONE_REMOVED: ImageRemoved = { logo: false, cover: false };
const NO_IMAGE_ERRORS: ImageErrors = { logo: null, cover: null };

const IMAGE_URL_FIELD: Record<CompanyImageKind, 'logoUrl' | 'coverImageUrl'> = {
  logo: 'logoUrl',
  cover: 'coverImageUrl',
};

export function useCompanyProfile() {
  const { user } = useAuth();
  const allow = useCan();
  const canEdit = allow('settings.edit');

  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null);
  /** The saved state, and what Cancel restores. */
  const [saved, setSaved] = useState<CompanyFormValues>(EMPTY_FORM_VALUES);
  const [values, setValues] = useState<CompanyFormValues>(EMPTY_FORM_VALUES);
  const [errors, setErrors] = useState<CompanyFieldErrors>({});

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<ProfileMessage | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [staged, setStaged] = useState<ImageStaging>(NO_STAGING);
  const [removed, setRemoved] = useState<ImageRemoved>(NONE_REMOVED);
  const [imageErrors, setImageErrors] = useState<ImageErrors>(NO_IMAGE_ERRORS);

  // Identity the draft store cannot invent, taken from the session. Both go
  // away with the store: the real GET /tenant reads them from the access token.
  const seedName = user?.tenantName ?? null;
  const seedSubdomain = user?.tenantSubdomain ?? resolveTenantHost().subdomain;

  const clearStaging = useCallback(() => {
    setStaged(NO_STAGING);
    setRemoved(NONE_REMOVED);
    setImageErrors(NO_IMAGE_ERRORS);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await companyApi.get({ name: seedName, subdomain: seedSubdomain });
      const asForm = toFormValues(loaded);
      setProfile(loaded);
      setSaved(asForm);
      // A reload is the authoritative answer, so it replaces the edit buffer
      // too — otherwise a 409 recovery would leave stale text on screen under
      // a banner saying it had been refreshed.
      setValues(asForm);
      setErrors({});
      clearStaging();
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(describeCompanyError(err, 'load').message);
    } finally {
      setLoading(false);
    }
  }, [seedName, seedSubdomain, clearStaging]);

  // Re-runs when the signed-in identity changes, so switching workspaces on one
  // device never leaves the previous company's details on screen.
  useEffect(() => {
    void load();
  }, [load, user?.id]);

  /** The stored URL for an image kind, ignoring anything staged. */
  const savedImage = (kind: CompanyImageKind): string | null =>
    profile?.[IMAGE_URL_FIELD[kind]] ?? null;

  /** What the controls should show right now, staged edits included. */
  const shownImage = (kind: CompanyImageKind): string | null =>
    staged[kind]?.preview ?? (removed[kind] ? null : savedImage(kind));

  const imagesChanged = (['logo', 'cover'] as const).some(
    (kind) => staged[kind] !== null || (removed[kind] && savedImage(kind) !== null),
  );
  const dirty = isDirty(saved, values) || imagesChanged;

  function change(field: CompanyTextField, value: string) {
    setMessage(null);
    const next = { ...values, [field]: value };
    setValues(next);
    // Only fields already flagged re-validate as you type. Everything else
    // waits for Save, so nothing turns red while it is still being typed.
    if (errors[field]) {
      const remaining = validateCompanyProfile(next);
      setErrors((current) => ({ ...current, [field]: remaining[field] }));
    }
  }

  /** Adds or removes one item from a list field. A set cannot be malformed. */
  function toggleListValue(field: CompanyListField, id: string) {
    setMessage(null);
    setValues((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((entry) => entry !== id)
        : [...current[field], id],
    }));
  }

  /** Free-text lists (values, office locations) are replaced wholesale. */
  function setList(field: CompanyListField, next: string[]) {
    setMessage(null);
    setValues((current) => ({ ...current, [field]: next }));
  }

  /** Stages a picked file: validated, previewed, but not uploaded. */
  async function pickImage(kind: CompanyImageKind, file: File) {
    setMessage(null);
    const problem = validateImageFile(file, kind);
    if (problem) {
      setImageErrors((current) => ({ ...current, [kind]: problem }));
      return;
    }
    try {
      const preview = await readFileAsDataUrl(file);
      setStaged((current) => ({ ...current, [kind]: { file, preview } }));
      setRemoved((current) => ({ ...current, [kind]: false }));
      setImageErrors((current) => ({ ...current, [kind]: null }));
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : 'That image could not be read.';
      setImageErrors((current) => ({ ...current, [kind]: text }));
    }
  }

  function removeImage(kind: CompanyImageKind) {
    setMessage(null);
    setStaged((current) => ({ ...current, [kind]: null }));
    setImageErrors((current) => ({ ...current, [kind]: null }));
    setRemoved((current) => ({ ...current, [kind]: savedImage(kind) !== null }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      // Images go first and separately: they are binaries on their own
      // endpoints, and a failure here must not be reported as "profile not
      // saved" when the text in fact never left.
      const urls: Record<'logoUrl' | 'coverImageUrl', string | null> = {
        logoUrl: savedImage('logo'),
        coverImageUrl: savedImage('cover'),
      };
      for (const kind of ['logo', 'cover'] as const) {
        const pending = staged[kind];
        if (pending) {
          urls[IMAGE_URL_FIELD[kind]] = await companyApi.uploadImage(kind, pending.file);
        } else if (removed[kind] && savedImage(kind) !== null) {
          await companyApi.removeImage(kind);
          urls[IMAGE_URL_FIELD[kind]] = null;
        }
      }

      const updated = await companyApi.update(toUpdateRequest(values), {
        name: seedName,
        subdomain: seedSubdomain,
      });
      const withImages = { ...updated, ...urls };
      const asForm = toFormValues(withImages);
      setProfile(withImages);
      setSaved(asForm);
      // Adopt the server's copy: it has been normalised ('abc.com' is now
      // 'https://abc.com'), and the read view must show what was stored.
      setValues(asForm);
      clearStaging();
      setEditing(false);
      setMessage({ tone: 'success', text: 'Company profile updated successfully.' });
    } catch (err: unknown) {
      const plan = describeCompanyError(err, 'save');
      setMessage({ tone: plan.tone, text: plan.message });
      if (plan.refetch) {
        await load();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  /** Validates; saves only when clean. Returns what stopped it, for focus. */
  function submit(): CompanyFieldErrors {
    const found = validateCompanyProfile(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setMessage({
        tone: 'error',
        text: 'Some details need fixing before this can be saved — see the highlighted fields.',
      });
      return found;
    }
    void save();
    return {};
  }

  function startEditing() {
    setMessage(null);
    setErrors({});
    setValues(saved);
    clearStaging();
    setEditing(true);
  }

  function cancel() {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    setEditing(false);
    setErrors({});
  }

  function discard() {
    setValues(saved);
    setErrors({});
    clearStaging();
    setEditing(false);
    setConfirmDiscard(false);
    setMessage(null);
  }

  return {
    /** The last known saved profile, or null before the first load lands. */
    profile,
    /** Saved values — what the read view and the public preview render. */
    saved,
    /** Edit buffer — what the form renders. */
    values,
    errors,
    savedLogoUrl: savedImage('logo'),
    savedCoverUrl: savedImage('cover'),
    shownLogoUrl: shownImage('logo'),
    shownCoverUrl: shownImage('cover'),
    imageErrors,
    canEdit,
    editing,
    loading,
    loadError,
    saving,
    message,
    dirty,
    confirmDiscard,
    previewOpen,
    setMessage,
    reload: load,
    change,
    toggleListValue,
    setList,
    pickImage,
    removeImage,
    submit,
    startEditing,
    cancel,
    discard,
    keepEditing: () => setConfirmDiscard(false),
    openPreview: () => setPreviewOpen(true),
    closePreview: () => setPreviewOpen(false),
  };
}

export type CompanyProfileController = ReturnType<typeof useCompanyProfile>;

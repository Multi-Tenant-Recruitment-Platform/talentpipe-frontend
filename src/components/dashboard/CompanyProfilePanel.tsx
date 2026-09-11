import type { CompanyProfileController } from '../../dashboard/useCompanyProfile';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CompanyProfileForm } from './CompanyProfileForm';
import { CompanyProfileSkeleton } from './CompanyProfileSkeleton';
import { CompanyProfileView, type CompanyProfileVariant } from './CompanyProfileView';
import { CompanyPublicPreview } from './CompanyPublicPreview';

/**
 * The whole view/edit exchange for one company profile: loading, the read
 * view, the form, the public preview, the discard prompt, and the banners
 * around them.
 *
 * <p>Both surfaces render this — the Profile Management page and the Company
 * Settings card — passing the same controller and differing only by `variant`.
 * That is what stops "avoid duplicating functionality" from being a promise
 * nobody keeps: there is one implementation, and the second screen is a prop.</p>
 */
export function CompanyProfilePanel({
  controller,
  variant = 'compact',
  onEdit,
}: Readonly<{
  controller: CompanyProfileController;
  variant?: CompanyProfileVariant;
  /**
   * What "Edit profile" does. Defaults to opening the editor in place; a page
   * that gives the editor its own URL navigates there instead.
   */
  onEdit?: () => void;
}>) {
  const {
    saved,
    values,
    errors,
    shownLogoUrl,
    shownCoverUrl,
    savedLogoUrl,
    savedCoverUrl,
    imageErrors,
    profile,
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
    reload,
    change,
    toggleListValue,
    setList,
    pickImage,
    removeImage,
    submit,
    startEditing,
    cancel,
    discard,
    keepEditing,
    openPreview,
    closePreview,
  } = controller;

  return (
    <>
      {/* Load and save failures keep separate slots: a rejected save must not
          blank a profile that loaded perfectly well. */}
      {loadError && (
        <Alert tone="error" className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="secondary" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        </Alert>
      )}

      {message && (
        <Alert tone={message.tone} onDismiss={() => setMessage(null)} className="mb-6">
          {message.text}
        </Alert>
      )}

      {loading && <CompanyProfileSkeleton logoSize={variant === 'profile' ? 'lg' : 'md'} />}

      {!loading && editing && (
        <CompanyProfileForm
          values={values}
          errors={errors}
          dirty={dirty}
          saving={saving}
          logoUrl={shownLogoUrl}
          coverUrl={shownCoverUrl}
          imageErrors={imageErrors}
          onChange={change}
          onToggleListValue={toggleListValue}
          onChangeList={setList}
          onPickImage={(kind, file) => void pickImage(kind, file)}
          onRemoveImage={removeImage}
          onSubmit={submit}
          onCancel={cancel}
        />
      )}

      {!loading && !editing && (
        <>
          <CompanyProfileView
            values={saved}
            logoUrl={savedLogoUrl}
            coverUrl={savedCoverUrl}
            updatedAt={profile?.updatedAt ?? null}
            canEdit={canEdit}
            onEdit={onEdit ?? startEditing}
            // The preview belongs on the presentation surface. In the settings
            // card it would be a third button competing for a small footer.
            onPreview={variant === 'profile' ? openPreview : undefined}
            variant={variant}
          />
          {!canEdit && (
            <p className="mt-5 border-t border-slate-100 pt-5 text-xs text-slate-500">
              Your role can view this profile but not change it. Ask a Company Admin to update it.
            </p>
          )}
        </>
      )}

      {previewOpen && (
        <CompanyPublicPreview
          values={saved}
          logoUrl={savedLogoUrl}
          coverUrl={savedCoverUrl}
          onClose={closePreview}
        />
      )}

      <ConfirmDialog
        open={confirmDiscard}
        tone="danger"
        title="Discard your changes?"
        description="The edits you have made to the company profile will be lost. This can't be undone."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={discard}
        onCancel={keepEditing}
      />
    </>
  );
}

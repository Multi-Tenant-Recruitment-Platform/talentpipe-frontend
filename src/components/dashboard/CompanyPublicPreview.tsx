import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  formatLocation,
  websiteLabel,
  workModeLabel,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { useFocusTrap } from '../ui/useFocusTrap';
import { Badge } from './Badge';
import { CompanyBenefits } from './CompanyBenefits';
import { CompanyCoverImage } from './CompanyCoverImage';
import { CompanySocialRow } from './CompanySocialLinks';
import { CompanyStoryInformation } from './CompanyStoryInformation';
import { Icon } from './Icon';

/**
 * The company profile as a candidate would meet it.
 *
 * <p>This is a preview, not a route. No public company page exists in the
 * router yet, and adding one is a larger architectural decision than this
 * story carries — but an admin still needs to see what they are publishing
 * before they publish it, and "looks fine in the editor" has never been the
 * same question as "reads well to a stranger".</p>
 *
 * <p>Everything here is read-only and reads from the same values the
 * management view does, so it cannot show a company that does not exist. When
 * the public route is built, this component is the thing to lift into it.</p>
 */

/** One fact in the summary strip. */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      {/* Wraps rather than truncates: "Information Technol…" in the one place
          a candidate looks for the industry is worse than a second line. */}
      <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export function CompanyPublicPreview({
  values,
  logoUrl,
  coverUrl,
  onClose,
}: Readonly<{
  values: CompanyFormValues;
  logoUrl: string | null;
  coverUrl: string | null;
  onClose: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, true, { initialFocusRef: closeRef });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const location = formatLocation(values);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      {/* Not a button: a focusable backdrop is a tab stop that reads as an
          unlabelled control and duplicates Close. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      {/* A native <dialog> rather than a div with role="dialog": the element
          carries the role itself. It is rendered with `open` instead of
          showModal() because the surrounding fixed overlay already owns the
          positioning and the backdrop. The p-0/max-h-none/text-inherit classes
          undo the user-agent styles that would otherwise pad, cap and recolour
          the panel. */}
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby="public-preview-title"
        className="relative m-0 h-auto max-h-none w-full max-w-3xl overflow-visible rounded-2xl bg-white p-0 text-inherit shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5"
      >
        {/* Says plainly that this is a rehearsal, not the live page. */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-3">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <Icon name="eye" className="h-4 w-4 text-slate-400" />
            Preview — this is how your profile reads to a candidate
          </p>
          <Button ref={closeRef} type="button" size="sm" variant="ghost" onClick={onClose}>
            <Icon name="x-mark" className="h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="space-y-7 p-6 sm:p-8">
          <div>
            <CompanyCoverImage coverUrl={coverUrl} logoUrl={logoUrl} name={values.name} />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="public-preview-title"
                  className="truncate text-2xl font-bold tracking-tight text-slate-900"
                >
                  {values.name || 'Unnamed company'}
                </h2>
                {values.tagline && (
                  <p className="mt-1 text-sm text-slate-600">{values.tagline}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  {location && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="map-pin" className="h-4 w-4 text-slate-400" />
                      {location}
                    </span>
                  )}
                  {values.foundedYear && (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                      Founded {values.foundedYear}
                    </span>
                  )}
                </div>
                {values.workModes.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {values.workModes.map((mode) => (
                      <Badge key={mode} tone="emerald">
                        {workModeLabel(mode)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <CompanySocialRow values={values} />
            </div>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">About us</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
              {values.description || 'This company has not written a description yet.'}
            </p>
          </section>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-4">
            <Fact label="Industry" value={values.industry} />
            <Fact label="Company size" value={values.size} />
            <Fact label="Location" value={location} />
            <Fact label="Website" value={values.website ? websiteLabel(values.website) : ''} />
          </dl>

          {(values.mission || values.vision || values.values.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">What we stand for</h3>
              <div className="mt-3">
                <CompanyStoryInformation values={values} />
              </div>
            </section>
          )}

          {values.culture && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Our culture</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                {values.culture}
              </p>
            </section>
          )}

          {values.benefits.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Benefits & perks</h3>
              <div className="mt-3">
                <CompanyBenefits benefits={values.benefits} />
              </div>
            </section>
          )}

          <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
            <div className="min-w-0 text-sm text-slate-500">
              {/* The recruitment address wins where there is one — that is the
                  inbox a candidate's question should land in. */}
              {(values.hrEmail || values.email) && (
                <p className="truncate">
                  Get in touch:{' '}
                  <span className="font-medium text-slate-700">
                    {values.hrEmail || values.email}
                  </span>
                </p>
              )}
            </div>
            {/* The jobs board is a real route, so this goes somewhere rather
                than miming a link a candidate would find broken. An anchor,
                not a Button — it navigates, and nesting one in the other is
                invalid markup. */}
            <Link
              to="/jobs"
              onClick={onClose}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40"
            >
              <Icon name="briefcase" className="h-4 w-4" />
              View open positions
            </Link>
          </section>
        </div>
      </dialog>
    </div>
  );
}

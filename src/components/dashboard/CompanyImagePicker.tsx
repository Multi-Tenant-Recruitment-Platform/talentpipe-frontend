import { useRef, type ChangeEvent } from 'react';
import type { CompanyImageKind } from '../../api/types';
import {
  formatBytes,
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_HINTS,
  IMAGE_LABELS,
  MAX_IMAGE_BYTES,
} from '../../dashboard/companyImages';
import { Button } from '../ui/Button';
import { CompanyLogo } from './CompanyLogo';
import { Icon } from './Icon';

/**
 * Choosing one of the company's images: the current picture, a button to
 * replace it, one to clear it, and a preview of whatever is picked.
 *
 * <p>Nothing here uploads. The file is handed to the caller, which stages it
 * until Save — so picking an image and then hitting Cancel leaves the stored
 * one exactly as it was, which is what Cancel is supposed to mean.</p>
 *
 * <p>The `<input type="file">` is visually hidden and driven by a real button:
 * the native control cannot be styled to match the rest of the form, but it is
 * still the thing that opens the picker and still what a screen reader reads,
 * so it is hidden from sight only — never `display: none`.</p>
 */
export function CompanyImagePicker({
  kind,
  imageUrl,
  companyName,
  error,
  disabled = false,
  onPick,
  onRemove,
}: {
  kind: CompanyImageKind;
  /** What to show right now: the staged preview, or the stored image. */
  imageUrl: string | null;
  companyName: string;
  error: string | null;
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = IMAGE_LABELS[kind];

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onPick(file);
    }
    // Reset, so picking the same file twice in a row still fires a change
    // event — otherwise "choose, remove, choose the same again" does nothing.
    event.target.value = '';
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      {kind === 'logo' ? (
        <CompanyLogo src={imageUrl} name={companyName} size="md" />
      ) : (
        <div
          data-testid="cover-preview"
          className="h-16 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600"
        >
          {imageUrl && (
            <img src={imageUrl} alt={`${companyName || 'Company'} cover`} className="h-full w-full object-cover" />
          )}
        </div>
      )}

      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            id={`company-${kind}`}
            // The visible control is a <button>, so the input itself carries
            // the name assistive tech announces when focus lands on it.
            aria-label={label}
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Icon name={kind === 'logo' ? 'building' : 'eye'} className="h-4 w-4" />
            {imageUrl ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          </Button>
          {imageUrl && (
            <Button type="button" size="sm" variant="danger" disabled={disabled} onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>

        {error ? (
          <p role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
            <Icon name="warning" className="mt-px h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400">
            PNG, JPG, SVG or WebP, up to {formatBytes(MAX_IMAGE_BYTES[kind])}. {IMAGE_HINTS[kind]}
          </p>
        )}
      </div>
    </div>
  );
}

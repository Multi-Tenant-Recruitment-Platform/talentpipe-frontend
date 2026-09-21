import { Flex, Typography } from 'antd';
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
 *
 * <p>Deliberately not antd's `Upload`. That component owns a `fileList` of its
 * own, which would shadow the staging the profile controller already does, and
 * its hidden input is `display: none` — unreachable by keyboard and by the
 * tests that drive this. Since nothing is uploaded here, `Upload` would be
 * decoration over a control that already works.</p>
 */
export function CompanyImagePicker({
  kind,
  imageUrl,
  companyName,
  error,
  disabled = false,
  onPick,
  onRemove,
}: Readonly<{
  kind: CompanyImageKind;
  /** What to show right now: the staged preview, or the stored image. */
  imageUrl: string | null;
  companyName: string;
  error: string | null;
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}>) {
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
    <Flex wrap align="flex-start" gap={16}>
      {kind === 'logo' ? (
        <CompanyLogo src={imageUrl} name={companyName} size="md" />
      ) : (
        <div
          data-testid="cover-preview"
          style={{
            width: 128,
            height: 64,
            flexShrink: 0,
            overflow: 'hidden',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: 'var(--tp-brand-gradient)',
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={`${companyName || 'Company'} cover`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
      )}

      <div style={{ minWidth: 0 }}>
        <Typography.Text strong>{label}</Typography.Text>
        <Flex wrap align="center" gap={8} style={{ marginTop: 6 }}>
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
            <Icon name={kind === 'logo' ? 'building' : 'eye'} size={16} />
            {imageUrl ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          </Button>
          {imageUrl && (
            // No icon: the accessible name has to stay exactly "Remove".
            <Button type="button" size="sm" variant="danger" disabled={disabled} onClick={onRemove}>
              Remove
            </Button>
          )}
        </Flex>

        {error ? (
          <Typography.Paragraph
            role="alert"
            type="danger"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 12, margin: '6px 0 0' }}
          >
            <Icon name="warning" size={14} style={{ marginTop: 1 }} />
            {error}
          </Typography.Paragraph>
        ) : (
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            PNG, JPG, SVG or WebP, up to {formatBytes(MAX_IMAGE_BYTES[kind])}. {IMAGE_HINTS[kind]}
          </Typography.Text>
        )}
      </div>
    </Flex>
  );
}

import { Flex, Typography } from 'antd';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { CV_ACCEPT_ATTRIBUTE, MAX_CV_BYTES, PROFILE_FOCUS_IDS, type DisplayedCv } from '../../candidate/candidateProfile';
import { formatBytes } from '../../dashboard/companyImages';
import { fontSize } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
import { Button } from '../ui/Button';

const PROMPT_ID = 'candidate-cv-prompt';
const HINT_ID = 'candidate-cv-hint';
const ERROR_ID = 'candidate-cv-error';

/**
 * The CV picker: a drop zone while there is no file, a file row once there is.
 *
 * <p>The drop zone is a real `<button>`, so Enter and Space open the picker and
 * it is announced as something to press. Dragging is a shortcut on top, not
 * the only way in. Like the photo picker, nothing uploads here — the file is
 * handed up and staged until Save. Deliberately not antd's `Upload`, for the
 * reasons `CompanyImagePicker` gives.</p>
 */
export function CandidateCvUpload({
  cv,
  pendingRemovalName,
  error,
  disabled = false,
  onPick,
  onRemove,
  onUndoRemove,
}: Readonly<{
  /** What the file row shows, or null for the drop zone. */
  cv: DisplayedCv | null;
  /** The stored CV's name while it is marked to go on Save. */
  pendingRemovalName: string | null;
  error: string | null;
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  onUndoRemove: () => void;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const openPicker = () => inputRef.current?.click();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onPick(file);
    }
    event.target.value = '';
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!disabled) {
      event.dataTransfer.dropEffect = 'copy';
      setDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    // dragleave also fires when the pointer moves onto a child; only a leave
    // to somewhere outside the zone ends the drag-over state.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) {
      onPick(file);
    }
  }

  const meta = cv
    ? [cv.format, cv.size === undefined ? null : formatBytes(cv.size)].filter(Boolean).join(' · ')
    : '';

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        id="candidate-cv"
        aria-label="CV / Resume file"
        accept={CV_ACCEPT_ATTRIBUTE}
        onChange={handleChange}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
      />

      {cv ? (
        <div className="tp-file-row">
          <span className="tp-file-row-icon">
            <Icon name="document-text" />
          </span>
          <div className="tp-file-row-body">
            <div className="tp-file-row-name">
              {/* Plain <p>: antd's Typography drops `title`, which is what
                  shows the whole name when the row truncates it. */}
              <p className="tp-file-row-filename" title={cv.name}>
                {cv.name}
              </p>
              {meta && <p className="tp-file-row-meta">{meta}</p>}
            </div>
            <Flex gap={8} style={{ flexShrink: 0 }}>
              <Button variant="secondary" disabled={disabled} aria-label={`Replace ${cv.name}`} onClick={openPicker}>
                Replace
              </Button>
              <Button variant="danger" disabled={disabled} aria-label={`Remove ${cv.name}`} onClick={onRemove}>
                Remove
              </Button>
            </Flex>
          </div>
        </div>
      ) : (
        <button
          id={PROFILE_FOCUS_IDS.cvDropzone}
          type="button"
          className="tp-dropzone"
          data-dragging={dragging || undefined}
          onClick={openPicker}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={disabled}
          aria-labelledby={PROMPT_ID}
          aria-describedby={error ? `${HINT_ID} ${ERROR_ID}` : HINT_ID}
        >
          <span className="tp-dropzone-icon">
            <Icon name="document-arrow-up" />
          </span>
          <span id={PROMPT_ID}>
            Drag &amp; drop or <span className="tp-dropzone-browse">browse</span>
          </span>
          <span id={HINT_ID} className="tp-dropzone-hint">
            PDF or DOCX, up to {formatBytes(MAX_CV_BYTES)}
          </span>
        </button>
      )}

      {error && (
        <Typography.Paragraph
          id={ERROR_ID}
          role="alert"
          type="danger"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: fontSize.caption, margin: '6px 0 0' }}
        >
          <Icon name="warning" size={14} style={{ marginTop: 1 }} />
          {error}
        </Typography.Paragraph>
      )}

      {pendingRemovalName && (
        <Flex wrap align="center" gap={8} style={{ marginTop: 6 }}>
          <Typography.Text type="secondary" style={{ minWidth: 0, fontSize: fontSize.small, wordBreak: 'break-all' }}>
            <Typography.Text strong>{pendingRemovalName}</Typography.Text> will be removed when you save.
          </Typography.Text>
          <Button
            variant="ghost"
            disabled={disabled}
            aria-label={`Undo removing ${pendingRemovalName}`}
            onClick={onUndoRemove}
          >
            Undo
          </Button>
        </Flex>
      )}
    </div>
  );
}

import { useRef, type ChangeEvent } from 'react';
import { MAX_PHOTO_BYTES, PROFILE_FOCUS_IDS } from '../../candidate/candidateProfile';
import { formatBytes, IMAGE_ACCEPT_ATTRIBUTE } from '../../dashboard/companyImages';
import { Icon } from '../dashboard/Icon';
import { Button } from '../ui/Button';

const PHOTO_HINT_ID = 'candidate-photo-hint';

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * The top of My profile: who this is, how complete the profile is, and the
 * photo controls.
 *
 * <p>Built on the same deep-blue panel as the jobs page hero, so a candidate's
 * two pages read as one product. It reflects the form live — type a name and
 * the heading follows — because seeing your profile take shape is the point
 * of the page.</p>
 *
 * <p>The photo contract is `CompanyImagePicker`'s: nothing uploads from here,
 * the file is staged until Save, and the `<input type="file">` is hidden from
 * sight only. It is also out of the tab order, since the labelled button is
 * the one control a keyboard user needs.</p>
 */
export function CandidateProfileHero({
  name,
  email,
  idNumber,
  inTalentPool,
  photoUrl,
  photoError,
  strength,
  doneCount,
  totalCount,
  disabled = false,
  onPickPhoto,
  onRemovePhoto,
}: Readonly<{
  name: string;
  email: string;
  idNumber: string;
  /** Membership as stored, not as currently ticked. */
  inTalentPool: boolean;
  /** The staged preview, or the stored photo. */
  photoUrl: string | null;
  photoError: string | null;
  strength: number;
  doneCount: number;
  totalCount: number;
  disabled?: boolean;
  onPickPhoto: (file: File) => void;
  onRemovePhoto: () => void;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = name.trim();
  const initials = initialsOf(displayName);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onPickPhoto(file);
    }
    // Reset, so picking the same file again after Remove still fires.
    event.target.value = '';
  }

  return (
    <section className="tp-profile-hero" aria-labelledby="profile-heading">
      <div className="tp-profile-hero-main">
        <div className="tp-profile-avatar">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName ? `Photo of ${displayName}` : 'Your photo'} />
          ) : (
            <span aria-hidden="true">{initials || <Icon name="user" size={40} />}</span>
          )}
        </div>

        <div className="tp-profile-hero-identity">
          <p className="tp-jobs-eyebrow">
            <Icon name="user" size={14} />
            My profile
          </p>
          <h1 id="profile-heading">
            <span className="sr-only">My profile: </span>
            {displayName || 'Complete your profile'}
          </h1>

          <ul className="tp-profile-facts" aria-label="Profile summary">
            {email.trim() && (
              <li className="tp-profile-chip">
                <Icon name="envelope" size={14} />
                <span className="tp-profile-chip-text">{email.trim()}</span>
              </li>
            )}
            {idNumber.trim() && (
              <li className="tp-profile-chip">
                <Icon name="identification" size={14} />
                <span className="sr-only">ID number </span>
                <span className="tp-profile-chip-text" data-numeric>
                  {idNumber.trim().toUpperCase()}
                </span>
              </li>
            )}
            {inTalentPool && (
              <li className="tp-profile-chip tp-profile-chip-pool">
                <Icon name="check" size={14} />
                Talent Pool member
              </li>
            )}
          </ul>

          <input
            ref={inputRef}
            type="file"
            id="candidate-photo"
            aria-label="Profile photo"
            accept={IMAGE_ACCEPT_ATTRIBUTE}
            onChange={handleChange}
            disabled={disabled}
            tabIndex={-1}
            className="sr-only"
          />
          <div className="tp-profile-photo-actions">
            <Button
              id={PROFILE_FOCUS_IDS.photo}
              variant="secondary"
              disabled={disabled}
              aria-describedby={PHOTO_HINT_ID}
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="camera" size={16} />
              {photoUrl ? 'Replace photo' : 'Upload photo'}
            </Button>
            {photoUrl && (
              <Button variant="ghost" className="tp-btn-on-dark" disabled={disabled} onClick={onRemovePhoto}>
                Remove<span className="sr-only"> photo</span>
              </Button>
            )}
          </div>
          {photoError ? (
            <p id={PHOTO_HINT_ID} role="alert" className="tp-profile-photo-error">
              <Icon name="warning" size={14} />
              {photoError}
            </p>
          ) : (
            <p id={PHOTO_HINT_ID} className="tp-profile-photo-hint">
              Optional. PNG, JPG, SVG or WebP, up to {formatBytes(MAX_PHOTO_BYTES)}.
            </p>
          )}
        </div>
      </div>

      <div className="tp-profile-meter">
        <div className="tp-profile-meter-head">
          <span id="profile-strength-label">Profile strength</span>
          <span className="tp-profile-meter-value" data-numeric>
            {strength}%
          </span>
        </div>
        <div
          className="tp-profile-meter-track"
          role="progressbar"
          aria-labelledby="profile-strength-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={strength}
        >
          <div className="tp-profile-meter-fill" style={{ width: `${strength}%` }} />
        </div>
        <p className="tp-profile-meter-note">
          {doneCount === totalCount
            ? 'Everything companies look for is here.'
            : `${doneCount} of ${totalCount} done — a complete profile is easier to match.`}
        </p>
      </div>
    </section>
  );
}

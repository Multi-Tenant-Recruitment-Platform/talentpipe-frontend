import { Progress } from 'antd';
import type { ChecklistItem, ChecklistTarget } from '../../candidate/candidateProfile';
import { primary, slate } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
import { ProfileSection } from './ProfileSection';

/**
 * What a complete profile has, and a way to each missing piece.
 *
 * <p>Every unfinished item is a button that takes focus to the field that
 * finishes it, so the list is a to-do the candidate can act on rather than a
 * score to feel bad about. Finished items stay listed — a list that empties
 * itself out gives no sense of progress.</p>
 */
export function ProfileChecklist({
  items,
  strength,
  onJump,
}: Readonly<{
  items: ChecklistItem[];
  strength: number;
  onJump: (target: ChecklistTarget) => void;
}>) {
  const remaining = items.filter((item) => !item.done).length;

  return (
    <ProfileSection
      id="profile-checklist"
      icon="sparkles"
      title="Complete your profile"
      subtitle={remaining === 0 ? 'All done.' : `${remaining} ${remaining === 1 ? 'step' : 'steps'} left`}
    >
      <div className="tp-checklist-summary">
        <Progress
          type="circle"
          percent={strength}
          size={64}
          strokeColor={primary[600]}
          railColor={slate[100]}
          // The bar above already announces the value; this ring is its echo.
          aria-hidden="true"
          format={(percent) => <span className="tp-checklist-percent">{percent}%</span>}
        />
        <p className="tp-checklist-blurb">
          {remaining === 0
            ? 'Your profile is complete. Keep it current as things change.'
            : 'Profiles with a photo, phone number and CV are the easiest for companies to match.'}
        </p>
      </div>

      <ul className="tp-checklist">
        {items.map((item) => (
          <li key={item.id}>
            {item.done ? (
              <div className="tp-checklist-item" data-done="">
                <span className="tp-checklist-mark">
                  <Icon name="check" size={12} />
                </span>
                {item.label}
                <span className="sr-only"> (done)</span>
              </div>
            ) : (
              <button type="button" className="tp-checklist-item" onClick={() => onJump(item.id)}>
                <span className="tp-checklist-mark" />
                {item.label}
                <span className="sr-only"> (to do)</span>
                <Icon name="chevron-right" size={14} style={{ marginLeft: 'auto' }} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

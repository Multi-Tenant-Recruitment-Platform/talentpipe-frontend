import { Typography } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { PROFILE_FOCUS_IDS } from '../../candidate/candidateProfile';
import { fontSize } from '../../theme/tokens';
import { Alert } from '../ui/Alert';

const CHECKBOX_ID = PROFILE_FOCUS_IDS.talentPool;
const LABEL_ID = 'candidate-talent-pool-label';
const HINT_ID = 'candidate-talent-pool-hint';
const CV_REGION_ID = 'candidate-cv-region';
const CV_HEADING_ID = 'candidate-cv-heading';

/**
 * Grows the CV block open on mount: it starts collapsed and opens a frame
 * later, which is what lets a freshly mounted element transition at all.
 * Closing is instant — the block is unmounted, not animated away.
 */
function Reveal({ children }: Readonly<{ children: ReactNode }>) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      id={CV_REGION_ID}
      role="region"
      aria-labelledby={CV_HEADING_ID}
      className="tp-reveal"
      data-open={open || undefined}
    >
      <div className="tp-reveal-inner">{children}</div>
    </div>
  );
}

/**
 * "Add me to the Talent Pool", and the optional CV that goes with it.
 *
 * <p>The CV belongs to the choice, not to the form at large, so it lives in
 * this card under the checkbox, inset behind a rule, and is not rendered at
 * all while the box is clear. A CV is never required to save.</p>
 *
 * <p>The checkbox is a native `<input>`, not antd's `Checkbox`: the whole row
 * is its label, and it has to carry `aria-expanded` / `aria-controls` for the
 * block it reveals, which antd does not pass through to the input.</p>
 */
export function CandidateTalentPool({
  checked,
  leavingPool,
  disabled = false,
  onToggle,
  children,
}: Readonly<{
  checked: boolean;
  /** A current member is being taken out by this save. */
  leavingPool: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
  /** The CV picker, shown only while checked. */
  children: ReactNode;
}>) {
  return (
    <div>
      <label htmlFor={CHECKBOX_ID} className="tp-option-row">
        <input
          id={CHECKBOX_ID}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
          aria-labelledby={LABEL_ID}
          aria-describedby={HINT_ID}
          aria-expanded={checked}
          aria-controls={CV_REGION_ID}
        />
        <span style={{ minWidth: 0 }}>
          <Typography.Text strong id={LABEL_ID} style={{ display: 'block' }}>
            Add me to the Talent Pool
          </Typography.Text>
          <Typography.Text type="secondary" id={HINT_ID} style={{ display: 'block', marginTop: 2 }}>
            Let companies on TalentPipe consider you for future job opportunities.
          </Typography.Text>
        </span>
      </label>

      {leavingPool && (
        <Alert tone="warning" role="status" style={{ marginTop: 12 }}>
          You'll be removed from the Talent Pool when you save.
        </Alert>
      )}

      {checked && (
        <Reveal>
          <div className="tp-cv-branch">
            <Typography.Title level={3} id={CV_HEADING_ID} style={{ fontSize: fontSize.body, margin: 0 }}>
              CV / Resume (Optional)
            </Typography.Title>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 2 }}>
              Upload a CV to help match you with future vacancies.
            </Typography.Text>
            <div style={{ marginTop: 12 }}>{children}</div>
          </div>
        </Reveal>
      )}
    </div>
  );
}

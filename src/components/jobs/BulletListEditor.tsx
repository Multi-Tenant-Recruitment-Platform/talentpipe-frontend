import { Flex, Input, Typography } from 'antd';
import { cleanValues } from '../../dashboard/companyProfile';
import { fontSize, slate, space } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
import { Button } from '../ui/Button';

/**
 * A list of short statements, edited one row at a time — responsibilities, and
 * the screening questions asked of every applicant.
 *
 * <p>Not the chip editor. These entries are sentences, not tags: they run past
 * the width a chip can carry, their order is meaningful, and nobody wants to
 * type "Own the release train end to end" into something that looks like a
 * label. Rows keep the full line visible and let the order be read down the
 * page, which is how the list is rendered on the advert.</p>
 *
 * <p>Row keys are positional, which is safe precisely because every input here
 * is controlled: the text comes from {@link values} on every render, so
 * removing a row re-renders the ones below it with their own text rather than
 * stranding uncontrolled DOM state behind a stale key.</p>
 */
export function BulletListEditor({
  id,
  values,
  onChange,
  placeholder,
  addLabel,
  itemLabel,
  max,
  invalid = false,
}: Readonly<{
  id: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  /** The add button's words — "Add responsibility", not "Add". */
  addLabel: string;
  /** Names one row for assistive tech: "Responsibility 2". */
  itemLabel: string;
  max?: number;
  invalid?: boolean;
}>) {
  // Always one row to type into: an empty list with no input is a dead end that
  // makes the reader hunt for the add button before they can start.
  const rows = values.length > 0 ? values : [''];
  const atLimit = max !== undefined && rows.length >= max;

  // A blank row is a row someone has not filled yet, not an entry. They are
  // kept in form state so the row stays on screen while it is being typed into,
  // and dropped by `normalizeVacancy` everywhere the list is counted, validated
  // or sent — so nothing downstream has to know they exist.
  function setRow(index: number, text: string) {
    const next = [...rows];
    next[index] = text;
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div>
      <ol className="tp-bullet-rows">
        {rows.map((row, index) => (
          // Positional key — safe here because every input below is controlled;
            // see the note in this component's doc comment.
          <li key={index} className="tp-bullet-row">
            <span aria-hidden="true" className="tp-bullet-marker">
              {index + 1}
            </span>
            <Input
              id={index === 0 ? id : undefined}
              value={row}
              status={invalid ? 'error' : undefined}
              aria-label={`${itemLabel} ${index + 1}`}
              placeholder={index === 0 ? placeholder : ''}
              onChange={(event) => setRow(index, event.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
              // The sole empty row has nothing to remove; removing the only
              // filled one is legitimate and puts the empty row back.
              disabled={rows.length === 1 && row.trim() === ''}
              onClick={() => removeRow(index)}
            >
              <Icon name="x-mark" size={16} />
            </Button>
          </li>
        ))}
      </ol>

      <Flex align="center" gap={space[1.5]} wrap style={{ marginTop: space[1] }}>
        <Button
          variant="secondary"
          size="sm"
          disabled={atLimit}
          onClick={() => onChange([...rows, ''])}
        >
          <Flex align="center" gap={6}>
            <Icon name="plus" size={14} />
            {addLabel}
          </Flex>
        </Button>
        {max !== undefined && (
          <Typography.Text
            type="secondary"
            style={{ fontSize: fontSize.caption, color: atLimit ? slate[600] : undefined }}
          >
            {cleanValues(rows).length} of {max}
          </Typography.Text>
        )}
      </Flex>
    </div>
  );
}

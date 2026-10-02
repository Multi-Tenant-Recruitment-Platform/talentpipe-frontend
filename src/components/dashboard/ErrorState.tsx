import { Flex, Typography } from 'antd';
import { fontSize, radius, slate, space, status } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { Icon } from './Icon';

/**
 * A panel-level failure: the thing this area exists to show could not be
 * loaded at all.
 *
 * <p>The counterpart to {@link EmptyState} — empty means "nothing here yet",
 * this means "something went wrong" — and to `Alert`, which belongs inline
 * when the rest of the page still works. Use this only where it replaces the
 * content, because it takes the whole panel.</p>
 *
 * <p>Two things are non-negotiable and the props enforce both: the message
 * names what failed rather than restating the status code, and there is a way
 * out. A dead end with a red icon tells the admin nothing they can act on, so
 * `onRetry` is how the component stays honest — omit it only when a retry
 * genuinely cannot help, and give `action` instead.</p>
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  action,
}: Readonly<{
  title?: string;
  /** What failed and what the reader can do about it, in the product's voice. */
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** An alternative way forward when retrying is not the recovery. */
  action?: React.ReactNode;
}>) {
  return (
    // role="alert" would interrupt; this is a region the reader lands in, not
    // an event that fires under them. The heading carries the announcement.
    <Flex
      vertical
      align="center"
      gap={space[1.5]}
      style={{ paddingBlock: space[5], paddingInline: space[3], textAlign: 'center' }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: '50%',
          // The one place colour is right: this is a failure, and the tint is
          // the same red the rest of the system means "error" with.
          background: status.errorBg,
          color: status.errorText,
        }}
      >
        <Icon name="warning" size={24} />
      </span>

      <div>
        <Typography.Paragraph
          strong
          style={{ margin: 0, fontSize: fontSize.lead, color: slate[900] }}
        >
          {title}
        </Typography.Paragraph>
        <Typography.Text
          type="secondary"
          style={{ display: 'block', maxWidth: 420, marginTop: space[0.5] }}
        >
          {description}
        </Typography.Text>
      </div>

      {(onRetry || action) && (
        <Flex gap={space[1]} wrap style={{ marginTop: space[0.5] }}>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              <Icon name="refresh" size={16} />
              {retryLabel}
            </Button>
          )}
          {action}
        </Flex>
      )}
    </Flex>
  );
}

/**
 * Loading placeholder for a list or table of rows.
 *
 * <p>Shaped like the rows it stands in for, so the panel does not resize when
 * the data lands — the jump is what makes a spinner feel slower than a
 * skeleton of the same duration. A centred spinner is the right answer only
 * when the shape of what is coming is genuinely unknown.</p>
 */
export function RowsSkeleton({
  rows = 4,
  label = 'Loading…',
  avatar = false,
}: Readonly<{
  rows?: number;
  /** Announced to screen readers, which get nothing from grey rectangles. */
  label?: string;
  /** Include a leading circle where each row starts with a person. */
  avatar?: boolean;
}>) {
  return (
    <div aria-busy="true" data-testid="rows-skeleton">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Flex
          key={i}
          align="center"
          gap={space[1.5]}
          style={{
            paddingBlock: space[1.5],
            borderTop: i === 0 ? undefined : `1px solid ${slate[100]}`,
          }}
        >
          {avatar && (
            <span
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: '50%',
                background: slate[100],
              }}
            />
          )}
          <Flex vertical gap={space[1]} style={{ flex: 1, minWidth: 0 }}>
            {/* Two bars of unequal width read as a title and its meta, which is
                what almost every row in this product actually is. */}
            <span
              style={{
                height: 10,
                width: `${58 - (i % 3) * 9}%`,
                borderRadius: radius.pill,
                background: slate[200],
              }}
            />
            <span
              style={{
                height: 8,
                width: `${34 - (i % 2) * 7}%`,
                borderRadius: radius.pill,
                background: slate[100],
              }}
            />
          </Flex>
        </Flex>
      ))}
    </div>
  );
}

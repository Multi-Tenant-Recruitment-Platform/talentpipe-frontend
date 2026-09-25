import { Empty, Typography } from 'antd';
import type { ReactNode } from 'react';
import { fontSize, slate, space } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';

/**
 * Centred icon + headline + explanation, with an optional call to action.
 *
 * <p>Extracted because this markup was hand-rolled twice inside TeamPage with
 * slightly different spacing, and an empty state without a next step is a dead
 * end — the `action` slot exists to make that hard to forget.</p>
 *
 * <p>The mark is neutral on purpose. An empty state is not a status: tinting it
 * indigo or emerald implies a severity that "you have not invited anyone yet"
 * does not carry, and the eye should land on the sentence and the button.</p>
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: Readonly<{
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <Empty
      style={{ paddingBlock: space[5] }}
      image={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: slate[100],
            color: slate[500],
          }}
        >
          <Icon name={icon} size={24} />
        </span>
      }
      imageStyle={{ height: 48, display: 'flex', justifyContent: 'center' }}
      description={
        <>
          <Typography.Paragraph
            strong
            style={{ marginBottom: space[0.5], fontSize: fontSize.lead, color: slate[900] }}
          >
            {title}
          </Typography.Paragraph>
          <Typography.Text
            type="secondary"
            style={{ display: 'block', maxWidth: 384, margin: '0 auto' }}
          >
            {description}
          </Typography.Text>
        </>
      }
    >
      {action}
    </Empty>
  );
}

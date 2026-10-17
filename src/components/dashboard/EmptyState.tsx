import { Empty, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { IconComponent } from '../ui/icon';

/**
 * Centred icon + headline + explanation, with an optional call to action.
 *
 * <p>Extracted because this markup was hand-rolled twice inside TeamPage with
 * slightly different spacing, and an empty state without a next step is a dead
 * end — the `action` slot exists to make that hard to forget.</p>
 *
 * <p>The mark takes the soft accent tile every icon on the job pages sits in —
 * never a status colour: green or amber would imply a severity that "you have
 * not invited anyone yet" does not carry, and the eye should land on the
 * sentence and the button.</p>
 */
export function EmptyState({
  icon: Glyph,
  title,
  description,
  action,
}: Readonly<{
  icon: IconComponent;
  title: string;
  description: string;
  action?: ReactNode;
}>) {
  return (
    <Empty
      className="py-10"
      image={
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-8 ring-primary-50/50">
          <Glyph aria-hidden className="text-[24px]" />
        </span>
      }
      imageStyle={{ height: 56, display: 'flex', justifyContent: 'center' }}
      description={
        <>
          <Typography.Paragraph strong className="mb-1 text-lead text-slate-900">
            {title}
          </Typography.Paragraph>
          <Typography.Text type="secondary" className="mx-auto my-0 block max-w-96">
            {description}
          </Typography.Text>
        </>
      }
    >
      {action}
    </Empty>
  );
}

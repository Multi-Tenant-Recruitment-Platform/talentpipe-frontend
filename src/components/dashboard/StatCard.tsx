import { FallOutlined, RiseOutlined } from '@ant-design/icons';
import { Card, Flex, Statistic, Typography } from 'antd';
import { fontSize, fontWeight, slate, space } from '../../theme/tokens';
import type { IconComponent } from '../ui/icon';

/**
 * KPI tile: an icon tile, the value, its label, and an optional trend delta.
 *
 * <p>The value is the loudest thing on the card — it is what an admin scans a
 * KPI row for, so it outranks both label and icon. The icon is a signpost for
 * finding the right tile again, not a category marker: every tile takes the
 * same soft accent tile the job pages use, never one hue per KPI — four hues
 * would read as a legend for a classification that does not exist, and would
 * compete with the one place on the card where colour carries real
 * information — the delta.</p>
 */
export function StatCard({
  label,
  value,
  icon: Glyph,
  delta,
}: Readonly<{
  label: string;
  value: string;
  icon: IconComponent;
  delta?: { value: string; direction: 'up' | 'down'; hint?: string };
}>) {
  // The only colour on the tile, and it is genuinely semantic: which way the
  // number moved. Contrast-checked against its own tint in tokens.test.ts.
  const deltaTone =
    delta?.direction === 'up' ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text';

  return (
    <Card styles={{ body: { padding: space[2.5] } }} className="h-full">
      <Flex align="center" justify="space-between">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Glyph aria-hidden className="text-[20px]" />
        </span>
        {delta && (
          <span
            className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption font-semibold ${deltaTone}`}
          >
            {delta.direction === 'up' ? (
              <RiseOutlined aria-hidden className="text-[14px]" />
            ) : (
              <FallOutlined aria-hidden className="text-[14px]" />
            )}
            {delta.value}
          </span>
        )}
      </Flex>

      <Statistic
        value={value}
        valueStyle={{
          fontSize: fontSize.display,
          fontWeight: fontWeight.bold,
          color: slate[900],
          lineHeight: 1.15,
        }}
        className="mt-4"
      />
      <Typography.Text type="secondary" className="mt-1 block">
        {label}
        {delta?.hint && <span className="opacity-75"> · {delta.hint}</span>}
      </Typography.Text>
    </Card>
  );
}

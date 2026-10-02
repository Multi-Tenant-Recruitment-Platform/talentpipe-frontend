import { Card, Flex, Statistic, Typography } from 'antd';
import {
  fontSize,
  fontWeight,
  radius,
  slate,
  space,
  status as statusColor,
} from '../../theme/tokens';
import { Icon, type IconName } from './Icon';

/**
 * KPI tile: a neutral icon chip, the value, its label, and an optional trend
 * delta.
 *
 * <p>The value is the loudest thing on the card — it is what an admin scans a
 * KPI row for, so it outranks both label and icon. The icon is a signpost for
 * finding the right tile again, not a category marker, which is why it is
 * neutral: four tiles in four hues make the row look like a legend for a
 * classification that does not exist, and they compete with the one place on
 * the card where colour carries real information — the delta.</p>
 */
export function StatCard({
  label,
  value,
  icon,
  delta,
}: Readonly<{
  label: string;
  value: string;
  icon: IconName;
  delta?: { value: string; direction: 'up' | 'down'; hint?: string };
}>) {
  // The only colour on the tile, and it is genuinely semantic: which way the
  // number moved. Contrast-checked against its own tint in tokens.test.ts.
  const deltaStyle =
    delta?.direction === 'up'
      ? { bg: statusColor.successBg, fg: statusColor.successText }
      : { bg: statusColor.errorBg, fg: statusColor.errorText };

  return (
    <Card styles={{ body: { padding: space[2.5] } }} style={{ height: '100%' }}>
      <Flex align="center" justify="space-between">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: radius.lg,
            background: slate[100],
            color: slate[600],
          }}
        >
          <Icon name={icon} size={20} />
        </span>
        {delta && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: space[0.5],
              padding: `2px ${space[1]}px`,
              borderRadius: radius.pill,
              fontSize: fontSize.caption,
              fontWeight: fontWeight.semibold,
              background: deltaStyle.bg,
              color: deltaStyle.fg,
            }}
          >
            <Icon name={delta.direction === 'up' ? 'trending-up' : 'trending-down'} size={14} />
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
        style={{ marginTop: space[2] }}
      />
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: space[0.5] }}>
        {label}
        {delta?.hint && <span style={{ opacity: 0.75 }}> · {delta.hint}</span>}
      </Typography.Text>
    </Card>
  );
}

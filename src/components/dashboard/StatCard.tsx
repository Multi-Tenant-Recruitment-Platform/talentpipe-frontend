import { Card, Flex, Statistic, Typography } from 'antd';
import { Icon, type IconName } from './Icon';

export type StatTone = 'indigo' | 'violet' | 'emerald' | 'amber';

/** Icon chip tint per tone. */
const TONE_CHIP: Record<StatTone, { bg: string; fg: string }> = {
  indigo: { bg: '#eef2ff', fg: '#4f46e5' },
  violet: { bg: '#ede9fe', fg: '#7c3aed' },
  emerald: { bg: '#d1fae5', fg: '#059669' },
  amber: { bg: '#fef3c7', fg: '#d97706' },
};

const DELTA_TONE = {
  up: { bg: '#d1fae5', fg: '#047857' },
  down: { bg: '#fee2e2', fg: '#b91c1c' },
} as const;

/**
 * KPI tile: tinted icon chip, bold value, label, and an optional trend delta
 * (e.g. "+12% vs last week"). The value is the loudest thing on the card —
 * it is what an admin scans for, so it outranks both label and icon.
 */
export function StatCard({
  label,
  value,
  icon,
  tone,
  delta,
}: Readonly<{
  label: string;
  value: string;
  icon: IconName;
  tone: StatTone;
  delta?: { value: string; direction: 'up' | 'down'; hint?: string };
}>) {
  const chip = TONE_CHIP[tone];
  const deltaTone = delta ? DELTA_TONE[delta.direction] : null;

  return (
    <Card styles={{ body: { padding: 20 } }} style={{ height: '100%' }}>
      <Flex align="center" justify="space-between">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 12,
            background: chip.bg,
            color: chip.fg,
          }}
        >
          <Icon name={icon} size={20} />
        </span>
        {delta && deltaTone && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: deltaTone.bg,
              color: deltaTone.fg,
            }}
          >
            <Icon name={delta.direction === 'up' ? 'trending-up' : 'trending-down'} size={14} />
            {delta.value}
          </span>
        )}
      </Flex>

      <Statistic
        value={value}
        valueStyle={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        style={{ marginTop: 16 }}
      />
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
        {label}
        {delta?.hint && <span style={{ opacity: 0.75 }}> · {delta.hint}</span>}
      </Typography.Text>
    </Card>
  );
}

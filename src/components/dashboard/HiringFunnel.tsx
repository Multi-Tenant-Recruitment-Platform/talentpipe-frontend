import { Flex, Progress, Typography } from 'antd';
import type { FunnelStage } from '../../data/mockDashboard';

/** One hue per stage, so a stage keeps its colour across both dashboards. */
const STAGE_COLORS: { from: string; to: string }[] = [
  { from: '#4f46e5', to: '#818cf8' },
  { from: '#7c3aed', to: '#a78bfa' },
  { from: '#9333ea', to: '#c084fc' },
  { from: '#c026d3', to: '#e879f9' },
  { from: '#059669', to: '#34d399' },
];

/** Conversion percentage from one stage to the next (null for the first). */
export function stageConversion(stages: FunnelStage[], index: number): number | null {
  if (index === 0 || stages[index - 1].count === 0) {
    return null;
  }
  return Math.round((stages[index].count / stages[index - 1].count) * 100);
}

/**
 * Horizontal-bar hiring funnel: each stage scales against the top of the
 * funnel, with stage-to-stage conversion percentages alongside.
 *
 * <p>Built from `Progress` bars rather than a charting library: antd has no
 * funnel, and five proportional bars need no axes, no legend and no tooltip to
 * be read correctly.</p>
 */
export function HiringFunnel({ stages }: Readonly<{ stages: FunnelStage[] }>) {
  const top = stages[0]?.count ?? 1;

  return (
    <Flex vertical gap={20}>
      {stages.map((stage, i) => {
        const conversion = stageConversion(stages, i);
        // A floor of 4%, so a stage with very few candidates is still a
        // visible bar rather than an empty track that reads as "no data".
        const width = Math.max(4, Math.round((stage.count / top) * 100));
        const color = STAGE_COLORS[i % STAGE_COLORS.length];
        return (
          <div key={stage.label}>
            <Flex align="baseline" justify="space-between" gap={16}>
              <Typography.Text strong>{stage.label}</Typography.Text>
              <Typography.Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {stage.count.toLocaleString()}
                {conversion !== null && (
                  <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    {conversion}% from {stages[i - 1].label.toLowerCase()}
                  </Typography.Text>
                )}
              </Typography.Text>
            </Flex>
            <Progress
              percent={width}
              showInfo={false}
              strokeColor={color}
              strokeLinecap="round"
              size={['100%', 12]}
              style={{ marginBottom: 0 }}
            />
          </div>
        );
      })}
    </Flex>
  );
}

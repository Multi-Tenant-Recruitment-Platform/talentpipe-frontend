import { Flex, Progress, Typography } from 'antd';
import type { FunnelStage } from '../../data/mockDashboard';
import { fontSize, primary, slate, space } from '../../theme/tokens';

/**
 * One accent for every bar.
 *
 * <p>This was five hues, each a two-stop gradient. Neither encoded anything:
 * the stage is named in the label beside its own bar, so the colour restated
 * a fact the row already stated — while the rainbow implied a categorical
 * scale across what is actually one measure, candidates, at five points in
 * time. The comparison the funnel exists to make is between bar *lengths*, and
 * a single accent is what lets the eye make it.</p>
 */
const STAGE_COLOR = primary[600];

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
    <Flex vertical gap={space[2.5]}>
      {stages.map((stage, i) => {
        const conversion = stageConversion(stages, i);
        // A floor of 4%, so a stage with very few candidates is still a
        // visible bar rather than an empty track that reads as "no data".
        const width = Math.max(4, Math.round((stage.count / top) * 100));
        return (
          <div key={stage.label}>
            <Flex align="baseline" justify="space-between" gap={space[2]}>
              <Typography.Text strong>{stage.label}</Typography.Text>
              <Typography.Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {stage.count.toLocaleString()}
                {conversion !== null && (
                  <Typography.Text type="secondary" style={{ marginLeft: space[1], fontSize: fontSize.caption }}>
                    {conversion}% from {stages[i - 1].label.toLowerCase()}
                  </Typography.Text>
                )}
              </Typography.Text>
            </Flex>
            <Progress
              percent={width}
              showInfo={false}
              strokeColor={STAGE_COLOR}
              strokeLinecap="round"
              size={['100%', 10]}
              trailColor={slate[100]}
              style={{ marginBottom: 0 }}
            />
          </div>
        );
      })}
    </Flex>
  );
}

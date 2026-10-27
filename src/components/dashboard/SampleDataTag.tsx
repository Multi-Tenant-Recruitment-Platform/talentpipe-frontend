import { ExperimentOutlined } from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';

/**
 * Marks a surface whose figures come from `src/data/mockDashboard.ts` rather
 * than the API.
 *
 * <p>PRODUCT.md's "claim only what exists": placeholder numbers must never be
 * dressed up as insight. The tag is quiet — neutral slate, caption size — so it
 * labels the card without shouting over it, and the tooltip says why.</p>
 */
export function SampleDataTag() {
  return (
    <Tooltip title="Preview figures. Live numbers arrive once this module is connected to your hiring data.">
      <Tag
        icon={<ExperimentOutlined aria-hidden />}
        className="m-0 inline-flex cursor-help items-center gap-1 rounded-pill border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold uppercase leading-[18px] tracking-[0.04em] text-slate-500"
      >
        Sample data
      </Tag>
    </Tooltip>
  );
}

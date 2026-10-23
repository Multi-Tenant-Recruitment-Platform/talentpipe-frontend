import { RightOutlined } from '@ant-design/icons';
import { STAGE_LABEL, type StageShape } from '../../dashboard/pipelineTemplate';

/**
 * A template's shape on one line: "Post application › Screening ›
 * Interview ×2 › Onboard". Read at a glance on a list row, where the counts
 * alone would not say whether screening is part of it.
 */
export function StageStrip({ shape, className = '' }: Readonly<{ shape: StageShape; className?: string }>) {
  const chips = [
    STAGE_LABEL.POST_APPLICATION,
    ...(shape.includeScreening ? [STAGE_LABEL.SCREENING] : []),
    shape.interviewRounds === 1 ? 'Interview' : `Interview ×${shape.interviewRounds}`,
    STAGE_LABEL.ONBOARD,
  ];
  const spoken = [
    'post application',
    ...(shape.includeScreening ? ['screening'] : []),
    `${shape.interviewRounds} interview ${shape.interviewRounds === 1 ? 'round' : 'rounds'}`,
    'onboard',
  ].join(', ');

  return (
    <p className={`m-0 ${className}`}>
      <span className="sr-only">Stages: {spoken}</span>
      <span aria-hidden="true" className="flex flex-wrap items-center gap-1">
        {chips.map((chip, i) => (
          <span key={chip} className="inline-flex items-center gap-1">
            {i > 0 && <RightOutlined className="text-[9px] text-slate-400" />}
            <span className="whitespace-nowrap rounded-pill bg-slate-100 px-2 py-0.5 text-caption font-medium text-slate-600">
              {chip}
            </span>
          </span>
        ))}
      </span>
    </p>
  );
}

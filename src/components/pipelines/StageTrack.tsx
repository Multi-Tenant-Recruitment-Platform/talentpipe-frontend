import { LockOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { PipelineStage } from '../../api/types';
import { orderedStages, STAGE_HELP, STAGE_LABEL } from '../../dashboard/pipelineTemplate';

type StageKind = 'fixed' | 'screening' | 'interview';

const NODE: Record<StageKind, string> = {
  fixed: 'bg-slate-100 text-slate-500 ring-slate-200',
  screening: 'bg-primary-50 text-primary-700 ring-primary-100',
  interview: 'bg-primary-600 text-white ring-primary-100',
};

const PANEL: Record<StageKind, string> = {
  fixed: 'border-slate-200 bg-canvas',
  screening: 'border-slate-200 bg-surface',
  interview: 'border-slate-200 bg-surface',
};

/**
 * One stop on the pipeline: a numbered node on a vertical line, and a panel
 * beside it. The line is what makes the stages read as a sequence a candidate
 * travels, rather than a stack of unrelated form fields.
 *
 * <p>The drawn number is hidden from assistive tech and repeated as text
 * inside the panel: the builder's list also holds the add and undo controls,
 * so the list position alone would not be the stage's position.</p>
 */
export function StageNode({
  position,
  kind,
  last = false,
  children,
}: Readonly<{
  position: number;
  kind: StageKind;
  last?: boolean;
  children: ReactNode;
}>) {
  return (
    <li className="relative flex gap-3 pb-3 sm:gap-4">
      {!last && <span aria-hidden="true" className="absolute top-9 bottom-0 left-4 w-px bg-slate-200" />}
      <span
        aria-hidden="true"
        className={`relative z-1 mt-2 inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-small font-semibold tabular-nums ring-4 ${NODE[kind]}`}
      >
        {position}
      </span>
      <div className={`min-w-0 flex-1 rounded-lg border px-4 py-3 ${PANEL[kind]}`}>
        {/* The drawn number is hidden; this is the same fact, read aloud. */}
        <span className="sr-only">Stage {position}. </span>
        {children}
      </div>
    </li>
  );
}

/** "Fixed · always first" — said in words, with the lock as a picture of it. */
export function FixedTag({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-slate-100 px-2 py-0.5 text-caption font-medium text-slate-600">
      <LockOutlined aria-hidden className="text-[11px]" />
      {children}
    </span>
  );
}

export function StageTitle({ children, aside }: Readonly<{ children: ReactNode; aside?: ReactNode }>) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-semibold text-slate-900">{children}</span>
      {aside}
    </div>
  );
}

/**
 * A saved template's stages, read-only — the same drawing as the builder,
 * without the controls, so what the admin built is what everyone else reads.
 */
export function StageTrack({ stages }: Readonly<{ stages: PipelineStage[] }>) {
  const ordered = orderedStages(stages);
  const interviewKeys = ordered.filter((stage) => stage.stageType === 'INTERVIEW');

  return (
    <ol className="m-0 list-none p-0" aria-label="Pipeline stages">
      {ordered.map((stage, i) => {
        const last = i === ordered.length - 1;
        if (stage.stageType === 'INTERVIEW') {
          const round = interviewKeys.indexOf(stage) + 1;
          return (
            <StageNode key={stage.id ?? i} position={i + 1} kind="interview" last={last}>
              <p className="m-0 text-caption font-medium uppercase tracking-caps text-slate-500">
                Interview round {round}
              </p>
              <StageTitle>{stage.name}</StageTitle>
              <p className="m-0 mt-1 text-small text-slate-600">
                Benchmark{' '}
                <span className="font-semibold tabular-nums text-slate-900">
                  {stage.benchmark ?? '—'} / 100
                </span>
              </p>
            </StageNode>
          );
        }
        const fixed = stage.stageType !== 'SCREENING';
        return (
          <StageNode key={stage.id ?? i} position={i + 1} kind={fixed ? 'fixed' : 'screening'} last={last}>
            <StageTitle
              aside={
                fixed ? <FixedTag>{stage.stageType === 'ONBOARD' ? 'Always last' : 'Always first'}</FixedTag> : undefined
              }
            >
              {STAGE_LABEL[stage.stageType]}
            </StageTitle>
            <p className="m-0 mt-0.5 text-small text-slate-600">{STAGE_HELP[stage.stageType]}</p>
          </StageNode>
        );
      })}
    </ol>
  );
}

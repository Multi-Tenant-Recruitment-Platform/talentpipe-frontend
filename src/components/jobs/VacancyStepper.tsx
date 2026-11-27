import { CheckOutlined, LockOutlined, WarningOutlined } from '@ant-design/icons';
import { useEffect, useRef } from 'react';

export type StepState = 'current' | 'done' | 'error' | 'todo' | 'locked';

export interface StepperStep {
  id: string;
  /** "01" … "08". */
  index: string;
  title: string;
  /** Shown under the title while the step is still ahead. */
  hint: string;
}

const CAPTIONS: Partial<Record<StepState, string>> = {
  current: 'You are here',
  done: 'Complete',
  error: 'Needs attention',
};

/**
 * The vacancy form's progress across the top: every step, where you are, and
 * how far you may go.
 *
 * <p>Horizontal because the form is now walked one step at a time, and a row
 * reads as a sequence the way a column of links does not. Every step stays in
 * view, so the shape of the whole task is never hidden behind Next. A step
 * ahead of an unfinished one is locked — Next will not leave a step with
 * missing answers, and the stepper keeps the same rule.</p>
 *
 * <p>Below the large breakpoint the row scrolls sideways and keeps the
 * current step centred; the line above it always says which step this is.</p>
 */
export function VacancyStepper({
  steps,
  current,
  stateOf,
  onSelect,
  filled,
  total,
}: Readonly<{
  steps: StepperStep[];
  current: number;
  stateOf: (index: number) => StepState;
  onSelect: (index: number) => void;
  /** Required fields answered, across the whole form. */
  filled: number;
  total: number;
}>) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the open step on screen in the scrolling strip.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    listRef.current
      ?.querySelector<HTMLElement>('[aria-current="step"]')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }, [current]);

  const percent = steps.length > 1 ? Math.round((current / (steps.length - 1)) * 100) : 100;

  return (
    <nav
      aria-label="Vacancy form steps"
      className="mb-5 rounded-xl border border-slate-200 bg-surface px-4 pt-4 pb-3 shadow-sm sm:px-6 sm:pt-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="m-0 text-small text-slate-500">
          <span className="font-semibold text-slate-900">
            Step {current + 1} of {steps.length}
          </span>
          <span aria-hidden="true"> · </span>
          <span>{steps[current]?.title}</span>
        </p>
        <p className="m-0 text-small tabular-nums text-slate-500">
          {filled} of {total} required fields complete
        </p>
      </div>

      <div aria-hidden="true" className="mb-4 h-1 overflow-hidden rounded-pill bg-slate-100">
        <div
          className="h-full rounded-pill bg-primary-600 transition-[width] duration-(--tp-motion-base) ease-standard motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol ref={listRef} className="m-0 -mx-1 flex list-none snap-x overflow-x-auto p-0 pb-1">
        {steps.map((step, index) => {
          const state = stateOf(index);
          const locked = state === 'locked';
          const last = index === steps.length - 1;

          return (
            <li key={step.id} className="relative min-w-[108px] flex-1 snap-center">
              {/* The line to the next step: filled once this one is behind you. */}
              {!last && (
                <span
                  aria-hidden="true"
                  data-passed={index < current}
                  className="absolute top-[17px] right-[calc(-50%+22px)] left-[calc(50%+22px)] h-0.5 rounded-pill bg-slate-200 transition-colors duration-(--tp-motion-base) data-[passed=true]:bg-primary-600"
                />
              )}
              <button
                type="button"
                data-state={state}
                disabled={locked}
                aria-current={state === 'current' ? 'step' : undefined}
                onClick={() => onSelect(index)}
                className="group relative flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-md border-0 bg-transparent px-1 py-1 text-center transition-colors duration-(--tp-motion-base) focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 items-center justify-center rounded-pill border border-slate-300 bg-surface text-small font-semibold tabular-nums text-slate-500 transition-[background,color,border-color,box-shadow] duration-(--tp-motion-base) ease-standard group-hover:border-primary-500 group-hover:text-primary-700 group-disabled:border-slate-200 group-disabled:text-slate-400 group-data-[state=current]:border-primary-600 group-data-[state=current]:bg-primary-600 group-data-[state=current]:text-white group-data-[state=current]:shadow-[0_0_0_4px_var(--tp-primary-100)] group-data-[state=done]:border-primary-200 group-data-[state=done]:bg-primary-50 group-data-[state=done]:text-primary-700 group-data-[state=error]:border-error group-data-[state=error]:bg-error-bg group-data-[state=error]:text-error-text"
                >
                  {state === 'done' ? (
                    <CheckOutlined aria-hidden className="text-[14px]" />
                  ) : state === 'error' ? (
                    <WarningOutlined aria-hidden className="text-[14px]" />
                  ) : locked ? (
                    <LockOutlined aria-hidden className="text-[13px]" />
                  ) : (
                    step.index
                  )}
                </span>
                <span className="text-caption leading-snug font-semibold text-slate-600 group-disabled:text-slate-400 group-data-[state=current]:text-primary-700 group-data-[state=done]:text-slate-900 group-data-[state=error]:text-error-text">
                  {step.title}
                </span>
                <span className="text-[11px] leading-tight text-slate-500 group-disabled:text-slate-400 group-data-[state=error]:text-error-text">
                  {CAPTIONS[state] ?? step.hint}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

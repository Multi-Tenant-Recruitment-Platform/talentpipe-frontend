import { CheckOutlined, WarningOutlined } from '@ant-design/icons';
import { VACANCY_SECTIONS, type SectionProgress } from '../../dashboard/jobVacancy';

/**
 * The form's table of contents, pinned beside it.
 *
 * <p>This is the piece that makes one long page beat a six-step wizard. A
 * wizard hides the shape of the task behind Next and refuses to let anyone save
 * halfway; the rail states all six sections up front, marks which are answered,
 * and lets a reader jump to the one they came for — while Save Draft stays
 * available on every one of them.</p>
 *
 * <p>Below the large breakpoint it becomes a horizontally scrollable strip
 * under the page header: the same six marks, laid along the one axis a narrow
 * screen has to spare.</p>
 */
export function VacancySectionRail({
  activeId,
  progressFor,
  errorSections,
  onJump,
}: Readonly<{
  activeId: string;
  progressFor: (sectionId: string) => SectionProgress;
  errorSections: Set<string>;
  onJump: (sectionId: string) => void;
}>) {
  return (
    // --- The rail ---
    // Below the large breakpoint it is a scrollable strip pinned under the top
    // bar; at large it becomes the left column and sticks beside the form.
    // Bleeds to the content edges so the strip reads as chrome, not as a card.
    // Clear of the sticky top bar, aligned with the content's own top gutter.
    <nav
      aria-label="Vacancy form sections"
      className="sticky top-(--tp-header-height) z-10 -mx-4 overflow-x-auto border-b border-slate-200 bg-canvas px-4 py-2 lg:top-[calc(var(--tp-header-height)+var(--tp-space-3))] lg:mx-0 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0"
    >
      <ol className="m-0 flex list-none gap-2 p-0 lg:flex-col lg:gap-0.5">
        {VACANCY_SECTIONS.map((section) => {
          const progress = progressFor(section.id);
          const done = progress.total > 0 && progress.complete;
          const touched = progress.filled > 0 || progress.optionalFilled > 0;
          const failing = errorSections.has(section.id);
          const current = activeId === section.id;

          let state: string;
          if (failing) {
            state = 'error';
          } else if (done) {
            state = 'done';
          } else if (touched) {
            state = 'started';
          } else {
            state = 'empty';
          }

          return (
            <li key={section.id}>
              <button
                type="button"
                className="group flex w-full cursor-pointer items-center gap-2.5 rounded-sm border border-transparent bg-transparent px-2.5 py-2 text-left text-slate-600 transition-[background,color,border-color] duration-(--tp-motion-base) ease-standard hover:bg-slate-100 hover:text-slate-900 focus-visible:border-primary-600 focus-visible:shadow-focus focus-visible:outline-none data-[current=true]:bg-primary-50 data-[current=true]:text-primary-700"
                data-current={current}
                data-state={state}
                aria-current={current ? 'step' : undefined}
                onClick={() => onJump(section.id)}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-pill bg-slate-100 text-caption font-semibold tabular-nums text-slate-500 group-data-[state=done]:bg-success-bg group-data-[state=done]:text-success-text group-data-[state=error]:bg-error-bg group-data-[state=error]:text-error-text group-data-[state=started]:bg-primary-100 group-data-[state=started]:text-primary-700"
                >
                  {failing ? (
                    <WarningOutlined aria-hidden className="text-[13px]" />
                  ) : done ? (
                    <CheckOutlined aria-hidden className="text-[13px]" />
                  ) : (
                    section.index
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="whitespace-nowrap text-small font-semibold">{section.title}</span>
                  {/* The second line is wayfinding detail; the strip has room for names only. */}
                  <span className="hidden whitespace-nowrap text-[11.5px] text-slate-500 group-data-[state=error]:text-error-text lg:inline">
                    {failing
                      ? 'Needs attention'
                      : progress.total > 0
                        ? `${progress.filled} of ${progress.total} required`
                        : `${progress.optionalFilled} added · optional`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

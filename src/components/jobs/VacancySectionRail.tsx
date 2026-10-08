import { VACANCY_SECTIONS, type SectionProgress } from '../../dashboard/jobVacancy';
import { Icon } from '../dashboard/Icon';

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
    <nav aria-label="Vacancy form sections" className="tp-vacancy-rail">
      <ol className="tp-vacancy-rail-list">
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
                className="tp-vacancy-rail-item"
                data-current={current}
                data-state={state}
                aria-current={current ? 'step' : undefined}
                onClick={() => onJump(section.id)}
              >
                <span aria-hidden="true" className="tp-vacancy-rail-mark">
                  {failing ? (
                    <Icon name="warning" size={13} />
                  ) : done ? (
                    <Icon name="check" size={13} />
                  ) : (
                    section.index
                  )}
                </span>
                <span className="tp-vacancy-rail-text">
                  <span className="tp-vacancy-rail-title">{section.title}</span>
                  <span className="tp-vacancy-rail-state">
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

import { WarningOutlined } from '@ant-design/icons';
import { TEMPLATE_SECTIONS } from './templateSections';

/**
 * The editor's table of contents — the vacancy form's rail, cut down to what a
 * four-section form needs: where you are, and which section has a problem.
 * Hidden below the large breakpoint, where the form is short enough to scroll.
 */
export function TemplateSectionRail({
  activeId,
  errorSections,
  onJump,
}: Readonly<{
  activeId: string;
  errorSections: Set<string>;
  onJump: (sectionId: string) => void;
}>) {
  return (
    <nav
      aria-label="Template editor sections"
      className="sticky top-[calc(var(--tp-header-height)+var(--tp-space-3))] hidden lg:block"
    >
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
        {TEMPLATE_SECTIONS.map((section) => {
          const current = activeId === section.id;
          const failing = errorSections.has(section.id);
          return (
            <li key={section.id}>
              <button
                type="button"
                className="group flex w-full cursor-pointer items-center gap-2.5 rounded-sm border border-transparent bg-transparent px-2.5 py-2 text-left text-slate-600 transition-[background,color,border-color] duration-(--tp-motion-base) ease-standard hover:bg-slate-100 hover:text-slate-900 focus-visible:border-primary-600 focus-visible:shadow-focus focus-visible:outline-none data-[current=true]:bg-primary-50 data-[current=true]:text-primary-700"
                data-current={current}
                aria-current={current ? 'step' : undefined}
                onClick={() => onJump(section.id)}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-pill bg-slate-100 text-caption font-semibold tabular-nums text-slate-500 data-[failing=true]:bg-error-bg data-[failing=true]:text-error-text"
                  data-failing={failing}
                >
                  {failing ? <WarningOutlined aria-hidden className="text-[13px]" /> : section.index}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="whitespace-nowrap text-small font-semibold">{section.title}</span>
                  {failing && <span className="text-[11.5px] text-error-text">Needs attention</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

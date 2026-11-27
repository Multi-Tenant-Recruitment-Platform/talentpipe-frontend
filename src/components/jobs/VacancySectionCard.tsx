import { CheckOutlined } from '@ant-design/icons';
import { Card, Row, Typography } from 'antd';
import type { ReactNode, Ref } from 'react';
import type { SectionProgress, VacancySection } from '../../dashboard/jobVacancy';
import { space } from '../../theme/tokens';

/**
 * One numbered section of the vacancy form.
 *
 * <p>A real `<fieldset>`/`<legend>`, not a styled heading: the pair is what
 * associates these controls with their section name for assistive tech, and a
 * form of this length read as one undifferentiated run of forty inputs without
 * it. The company profile form makes the same trade for the same reason.</p>
 *
 * <p>The number is not decoration. The stepper above the form shows the same
 * figures, so it is how a reader matches the card in front of them to where
 * they are in the sequence.</p>
 *
 * <p>The title is the focus target when a step opens, so keyboard and
 * screen-reader users land on the heading of the step they just moved to
 * rather than on the button they pressed.</p>
 */
export function VacancySectionCard({
  section,
  progress,
  hasError,
  headingRef,
  children,
}: Readonly<{
  section: VacancySection;
  progress: SectionProgress;
  hasError: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}>) {
  const done = progress.total > 0 && progress.complete;

  return (
    <Card id={section.id} styles={{ body: { padding: space[3] } }}>
      {/* A fieldset carries an intrinsic minimum width that would stop the grid
          inside it from ever shrinking; min-width:0 is what lets the columns wrap. */}
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 flex w-full items-center gap-3 p-0">
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-slate-100 text-small font-semibold tabular-nums tracking-[0.02em] text-slate-500 data-[state=done]:bg-primary-50 data-[state=done]:text-primary-700"
            data-state={done ? 'done' : 'todo'}
          >
            {section.index}
          </span>
          {/* A heading inside the legend: the legend still names the group, and the
              heading gives the step a place in the page outline and a focus target. */}
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="m-0 text-title font-semibold tracking-heading text-slate-900 focus:outline-none"
          >
            {section.title}
          </h2>
          {progress.total > 0 && (
            // The count is detail, not structure — at phone width the heading keeps it.
            <span
              className="ms-auto hidden items-center gap-1 whitespace-nowrap text-caption font-medium text-slate-500 data-[state=done]:text-success-text data-[state=error]:text-error-text sm:inline-flex"
              data-state={hasError ? 'error' : done ? 'done' : 'todo'}
            >
              {done && !hasError && <CheckOutlined aria-hidden className="text-[14px]" />}
              {hasError
                ? 'Needs attention'
                : done
                  ? 'Complete'
                  : `${progress.filled} of ${progress.total} required`}
            </span>
          )}
        </legend>

        <Typography.Paragraph type="secondary" className="m-0 mb-5 text-small">
          {section.summary}
        </Typography.Paragraph>

        <Row gutter={[space[2.5], space[2.5]]}>{children}</Row>
      </fieldset>
    </Card>
  );
}

import { Card, Row, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { SectionProgress, VacancySection } from '../../dashboard/jobVacancy';
import { fontSize, space } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';

/**
 * One numbered section of the vacancy form.
 *
 * <p>A real `<fieldset>`/`<legend>`, not a styled heading: the pair is what
 * associates these controls with their section name for assistive tech, and a
 * form of this length read as one undifferentiated run of forty inputs without
 * it. The company profile form makes the same trade for the same reason.</p>
 *
 * <p>The number is not decoration. The rail beside the form lists the same six,
 * so the figure is how a reader matches where they are against how much is
 * left — which is the one thing a long single-page form owes them.</p>
 */
export function VacancySectionCard({
  section,
  progress,
  hasError,
  children,
}: Readonly<{
  section: VacancySection;
  progress: SectionProgress;
  hasError: boolean;
  children: ReactNode;
}>) {
  const done = progress.total > 0 && progress.complete;

  return (
    <Card id={section.id} className="tp-vacancy-section" styles={{ body: { padding: space[3] } }}>
      <fieldset className="tp-vacancy-fieldset">
        <legend className="tp-vacancy-legend">
          <span
            aria-hidden="true"
            className="tp-vacancy-index"
            data-state={done ? 'done' : 'todo'}
          >
            {section.index}
          </span>
          <span className="tp-vacancy-legend-text">{section.title}</span>
          {progress.total > 0 && (
            <span className="tp-vacancy-count" data-state={hasError ? 'error' : done ? 'done' : 'todo'}>
              {done && !hasError && <Icon name="check" size={14} />}
              {hasError
                ? 'Needs attention'
                : done
                  ? 'Complete'
                  : `${progress.filled} of ${progress.total} required`}
            </span>
          )}
        </legend>

        <Typography.Paragraph
          type="secondary"
          style={{ fontSize: fontSize.small, margin: `0 0 ${space[2.5]}px` }}
        >
          {section.summary}
        </Typography.Paragraph>

        <Row gutter={[space[2.5], space[2.5]]}>{children}</Row>
      </fieldset>
    </Card>
  );
}

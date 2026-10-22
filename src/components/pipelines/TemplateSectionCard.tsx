import { Card, Typography } from 'antd';
import type { ReactNode } from 'react';
import { space } from '../../theme/tokens';
import type { TemplateSection } from './templateSections';

/**
 * One numbered section of the template editor — the vacancy form's section
 * card, without the required-field count: this form is short enough that the
 * issue count in the action bar says it once for all four.
 */
export function TemplateSectionCard({
  section,
  hasError,
  children,
}: Readonly<{
  section: TemplateSection;
  hasError: boolean;
  children: ReactNode;
}>) {
  return (
    <Card id={section.id} className="scroll-mt-33 lg:scroll-mt-20" styles={{ body: { padding: space[3] } }}>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-1.5 flex w-full items-center gap-3 p-0">
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-slate-100 text-small font-semibold tabular-nums tracking-[0.02em] text-slate-500"
          >
            {section.index}
          </span>
          <span className="text-title font-semibold tracking-heading text-slate-900">{section.title}</span>
          {hasError && (
            <span className="ms-auto hidden whitespace-nowrap text-caption font-medium text-error-text sm:inline">
              Needs attention
            </span>
          )}
        </legend>
        <Typography.Paragraph type="secondary" className="m-0 mb-5 text-small">
          {section.summary}
        </Typography.Paragraph>
        {children}
      </fieldset>
    </Card>
  );
}

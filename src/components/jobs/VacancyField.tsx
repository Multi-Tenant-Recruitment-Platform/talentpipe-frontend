import { Col, Typography } from 'antd';
import type { ReactNode } from 'react';
import { FIELD_LABELS, isRequired, type JobVacancyField } from '../../dashboard/jobVacancy';
import { FieldError } from '../ui/FieldError';
import {
  vacancyErrorId,
  vacancyFieldId,
  vacancyGroupId,
  vacancyLabelId,
} from './vacancyFieldIds';

/**
 * One labelled field in the vacancy form.
 *
 * <p>The same contract the company profile form uses — a real `<label
 * htmlFor>`, the error replacing the hint rather than stacking under it, and
 * `role="alert"` so a failed submit is announced — extended with the two things
 * a form this long needs: a required marker, and a group mode.</p>
 *
 * <p>Group mode exists because `<label htmlFor>` is only valid against a
 * labelable control. A day-of-week checkbox row or a chip list is several
 * controls, and pointing a label at the first one would misname the rest, so
 * those render as a real `role="group"` named by its own heading.</p>
 */

export function VacancyField({
  field,
  error,
  hint,
  span = 12,
  group = false,
  children,
}: Readonly<{
  field: JobVacancyField;
  error?: string;
  hint?: ReactNode;
  /** Columns out of 24 at `sm` and up; full width below. */
  span?: number;
  /** For several controls under one name — checkbox rows, chip lists. */
  group?: boolean;
  children: ReactNode;
}>) {
  const label = FIELD_LABELS[field];
  const required = isRequired(field);

  const name = (
    <>
      {label}
      {required && (
        <>
          {' '}
          <span aria-hidden="true" className="font-normal text-slate-400">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </>
  );

  const body = (
    <>
      {children}
      {error ? (
        <FieldError id={vacancyErrorId(field)}>{error}</FieldError>
      ) : (
        hint && (
          <Typography.Text type="secondary" className="mt-1.5 block text-caption">
            {hint}
          </Typography.Text>
        )
      )}
    </>
  );

  return (
    <Col xs={24} sm={span}>
      {group ? (
        // The id is how a failed submit reaches a group: there is no single
        // control to focus, so the page focuses the first one inside this.
        <div id={vacancyGroupId(field)} role="group" aria-labelledby={vacancyLabelId(field)}>
          <span id={vacancyLabelId(field)} className="mb-1.5 block font-medium">
            {name}
          </span>
          {body}
        </div>
      ) : (
        <>
          <label htmlFor={vacancyFieldId(field)} className="mb-1.5 block font-medium">
            {name}
          </label>
          {body}
        </>
      )}
    </Col>
  );
}

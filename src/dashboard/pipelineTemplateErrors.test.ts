import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { describeTemplateError, UNAVAILABLE } from './pipelineTemplateErrors';

function httpError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { status, message },
  } as AxiosResponse);
}

/** Spring's answer for a path no controller handles — a backend without the module. */
const missingRoute = httpError(404, 'Resource not found');
/** The pipeline module's own answer for an id it doesn't have. */
const missingTemplate = httpError(404, 'Pipeline template not found');

describe('404s', () => {
  it.each(['list', 'create'] as const)('reads a 404 on %s as a server without the template API', (kind) => {
    const plan = describeTemplateError(missingRoute, kind);
    expect(plan.message).toBe(UNAVAILABLE);
    expect(plan.unavailable).toBe(true);
    expect(plan.notFound).toBe(false);
  });

  it.each(['load', 'save', 'archive', 'duplicate', 'delete'] as const)(
    'tells a missing API apart from a missing template on %s',
    (kind) => {
      expect(describeTemplateError(missingRoute, kind)).toMatchObject({ unavailable: true, notFound: false });
      expect(describeTemplateError(missingTemplate, kind)).toMatchObject({ unavailable: false, notFound: true });
    },
  );
});

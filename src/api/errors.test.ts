import { describe, expect, it } from 'vitest';
import { apiErrorCode, apiErrorDetails, apiErrorStatus, apiFieldErrorMap, apiFieldErrors } from './errors';

const failure = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });

describe('api error readers', () => {
  it('read the code, status and payload of the envelope', () => {
    const err = failure(409, {
      code: 'WORKSPACE_SELECTION_REQUIRED',
      message: 'Choose which one to sign in to.',
      details: { selectionToken: 't', expiresInSeconds: 120, accounts: [] },
    });

    expect(apiErrorStatus(err)).toBe(409);
    expect(apiErrorCode(err)).toBe('WORKSPACE_SELECTION_REQUIRED');
    expect(apiErrorDetails<{ selectionToken: string }>(err)?.selectionToken).toBe('t');
  });

  it('map field errors by path, keeping the first message and stripping a prefix', () => {
    const err = failure(400, {
      code: 'VALIDATION_FAILED',
      fieldErrors: [
        { field: 'admin.email', message: 'Enter a valid email address.' },
        { field: 'admin.password', message: 'Use a password of 8 to 72 characters.' },
        { field: 'admin.password', message: 'second message is ignored' },
        { field: 'companyName', message: 'Enter your company name.' },
      ],
    });

    expect(apiFieldErrors(err)).toHaveLength(4);
    expect(apiFieldErrorMap(err, 'admin.')).toEqual({
      email: 'Enter a valid email address.',
      password: 'Use a password of 8 to 72 characters.',
      companyName: 'Enter your company name.',
    });
  });

  it('answer nothing, without throwing, for anything that is not an envelope', () => {
    for (const err of [new Error('network'), failure(500, 'plain text'), { isAxiosError: true }]) {
      expect(apiErrorCode(err)).toBeNull();
      expect(apiFieldErrors(err)).toEqual([]);
      expect(apiErrorDetails(err)).toBeNull();
    }
    expect(apiErrorStatus(new Error('network'))).toBeNull();
  });
});

import axios from 'axios';
import type { ApiError, ApiErrorCode, FieldErrorDetail } from './types';

/**
 * Typed reads of the backend's error envelope.
 *
 * <p>Screens decide what to do from {@link apiErrorCode}, never from the
 * wording of the message: the message is a sentence for people and may be
 * reworded at any time, the code is the contract. Before codes existed the
 * login form looked for "not verified" in the message, which silently broke
 * for an invitation that had not been accepted.</p>
 *
 * <p>Every reader is total: a network failure, a non-Axios error or an older
 * server without codes answers `null` or an empty list, never throws.</p>
 */

function envelopeOf(err: unknown): Partial<ApiError> | null {
  if (!axios.isAxiosError(err)) {
    return null;
  }
  const data = err.response?.data as Partial<ApiError> | undefined;
  return data && typeof data === 'object' ? data : null;
}

/** The HTTP status, or null when no response arrived. */
export function apiErrorStatus(err: unknown): number | null {
  return axios.isAxiosError(err) ? (err.response?.status ?? null) : null;
}

/** The stable reason the backend gave, or null. */
export function apiErrorCode(err: unknown): ApiErrorCode | null {
  return envelopeOf(err)?.code ?? null;
}

/** Per-field validation messages, in the order the backend sorted them (by field). */
export function apiFieldErrors(err: unknown): FieldErrorDetail[] {
  const fieldErrors = envelopeOf(err)?.fieldErrors;
  return Array.isArray(fieldErrors) ? fieldErrors : [];
}

/**
 * Field errors as a map from field path to its first message, the shape a
 * form shows them in. `admin.password` keeps its dots; a form for a nested
 * body strips the prefix it does not use.
 */
export function apiFieldErrorMap(err: unknown, stripPrefix = ''): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { field, message } of apiFieldErrors(err)) {
    const key = stripPrefix && field.startsWith(stripPrefix) ? field.slice(stripPrefix.length) : field;
    map[key] ??= message;
  }
  return map;
}

/** The code-specific payload, typed by the caller who knows which code it is reading. */
export function apiErrorDetails<T>(err: unknown): T | null {
  const details = envelopeOf(err)?.details;
  return details === undefined || details === null ? null : (details as T);
}

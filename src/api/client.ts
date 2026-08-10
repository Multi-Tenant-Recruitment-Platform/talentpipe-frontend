import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tenantGuardInterceptor } from './tenantGuard';
import { tokenStore } from './tokenStore';
import type { AuthResponse } from './types';

/**
 * Shared Axios instance.
 *
 * - Attaches the in-memory access token to every request.
 * - On a 401, transparently calls POST /auth/refresh ONCE (single-flight
 *   across concurrent requests) and retries the original request. A second
 *   401, or a failed refresh, surfaces as a session-expired event that the
 *   AuthContext turns into a logout.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Fired when the session cannot be recovered; AuthContext listens for it. */
export const SESSION_EXPIRED_EVENT = 'talentpipe:session-expired';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const accessToken = tokenStore.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

/** Marker added to a request config after its one allowed retry. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

/** Single-flight guard: many 401s at once trigger exactly one refresh call. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    // Bare axios on purpose: the shared instance's interceptors must not
    // recurse into another refresh attempt.
    const { data } = await axios.post<AuthResponse>(`${BASE_URL}/auth/refresh`, { refreshToken });
    tokenStore.setAccessToken(data.accessToken);
    tokenStore.setRefreshToken(data.refreshToken); // rotated by the backend
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetriableConfig | undefined;

  const isAuthAttempt =
    original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

  if (
    error.response?.status === 401 &&
    original &&
    !original._retried &&
    !isAuthAttempt &&
    tokenStore.getRefreshToken()
  ) {
    original._retried = true;
    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
    const newAccessToken = await refreshInFlight;
    if (newAccessToken) {
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    }
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  return Promise.reject(error);
});

// Cross-tenant tripwire. Registered last on purpose: axios runs response
// handlers in registration order, so nothing downstream can swallow or retry
// its rejection — a mismatch is terminal, never refreshed.
api.interceptors.response.use(tenantGuardInterceptor);

/**
 * Extracts the backend's uniform error envelope message, with a fallback.
 *
 * <p>Note that a TenantMismatchError is not an AxiosError, so it deliberately
 * falls through to the caller's fallback string. The user is being signed out
 * at that moment anyway — do not "fix" this by special-casing it here.</p>
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) {
      return message;
    }
  }
  return fallback;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, SESSION_EXPIRED_EVENT } from '../api/client';
import { tokenStore } from '../api/tokenStore';
import type { AuthResponse, RegisterRequest, RegisterResponse, UserResponse } from '../api/types';
import {
  activeTenant,
  TENANT_MISMATCH_EVENT,
  watchCrossTabTenantChange,
  type TenantMismatchDetail,
} from '../tenant/activeTenant';

/** Why the last session ended, so the login page can explain itself. */
export type SessionEndReason = 'expired' | 'tenant-mismatch';

/**
 * Application auth state. The access token itself lives in the token store
 * (in memory); this context owns the user profile and the login/logout
 * transitions the UI reacts to.
 */
interface AuthContextValue {
  /** Authenticated user, or null when signed out. */
  user: UserResponse | null;
  /** True while the initial session restore (refresh-token exchange) runs. */
  initializing: boolean;
  /** Set when a session ended by itself rather than by the user logging out. */
  sessionEndReason: SessionEndReason | null;
  /** Forgets the reason once it has been shown, so it is not repeated on the next login. */
  clearSessionEndReason: () => void;
  /**
   * Signs in with email and password. When they fit more than one account it
   * rejects with `409 WORKSPACE_SELECTION_REQUIRED`; finish with
   * {@link selectWorkspace}.
   */
  login: (email: string, password: string) => Promise<UserResponse>;
  /** Second step of a sign-in that fitted several accounts: signs in to the chosen one. */
  selectWorkspace: (selectionToken: string, accountId: string) => Promise<UserResponse>;
  register: (request: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionEndReason, setSessionEndReason] = useState<SessionEndReason | null>(null);

  const applyAuth = useCallback((auth: AuthResponse) => {
    tokenStore.setAccessToken(auth.accessToken);
    tokenStore.setRefreshToken(auth.refreshToken);
    // Stamp the workspace this session belongs to. Covers login and the
    // startup refresh alike, so a hard reload re-stamps from the authoritative
    // response. Null for candidates, which leaves the tenant guard inert.
    activeTenant.set(auth.user.tenantId);
    setUser(auth.user);
    setSessionEndReason(null);
  }, []);

  const clearAuth = useCallback(() => {
    tokenStore.clear();
    activeTenant.clear();
    setUser(null);
  }, []);

  // Restore the session on hard reload: the access token is memory-only, so
  // exchange the persisted refresh token for a fresh pair once at startup.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) {
        setInitializing(false);
        return;
      }
      try {
        const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
        if (!cancelled) {
          applyAuth(data);
        }
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [applyAuth, clearAuth]);

  // The API client signals an unrecoverable 401 (refresh failed) here.
  useEffect(() => {
    const onExpired = () => {
      clearAuth();
      setSessionEndReason('expired');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearAuth]);

  // A response arrived for another workspace, or another tab signed into one.
  // Ends the session locally and deliberately does NOT call /auth/logout: the
  // session state is exactly what we have stopped trusting.
  useEffect(() => {
    const onMismatch = (event: Event) => {
      if (import.meta.env.DEV) {
        console.error('[tenant] mismatch', (event as CustomEvent<TenantMismatchDetail>).detail);
      }
      clearAuth();
      setSessionEndReason('tenant-mismatch');
    };
    window.addEventListener(TENANT_MISMATCH_EVENT, onMismatch);
    const unwatch = watchCrossTabTenantChange();
    return () => {
      window.removeEventListener(TENANT_MISMATCH_EVENT, onMismatch);
      unwatch();
    };
  }, [clearAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      // Email and password alone, for company users and candidates alike: the
      // backend resolves which account they belong to. No workspace header.
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      applyAuth(data);
      return data.user;
    },
    [applyAuth],
  );

  const selectWorkspace = useCallback(
    async (selectionToken: string, accountId: string) => {
      // The token proves the password was checked against this account a
      // moment ago, so the password is not sent again.
      const { data } = await api.post<AuthResponse>('/auth/login/select', { selectionToken, accountId });
      applyAuth(data);
      return data.user;
    },
    [applyAuth],
  );

  const register = useCallback(async (request: RegisterRequest) => {
    const { data } = await api.post<RegisterResponse>('/auth/register', request);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Best effort — the server-side token expires regardless; the client
      // session is cleared either way.
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const clearSessionEndReason = useCallback(() => setSessionEndReason(null), []);

  const value = useMemo(
    () => ({ user, initializing, sessionEndReason, clearSessionEndReason, login, selectWorkspace, register, logout }),
    [user, initializing, sessionEndReason, clearSessionEndReason, login, selectWorkspace, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

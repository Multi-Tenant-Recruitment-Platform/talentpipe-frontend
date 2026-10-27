import { act, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCESS_DENIED_EVENT, api } from '../api/client';
import { tokenStore } from '../api/tokenStore';
import type { UserResponse } from '../api/types';
import { makeUser } from '../test/authHarness';
import { resetActiveTenantForTests } from '../tenant/activeTenant';
import { AuthProvider, useAuth } from './AuthContext';

/**
 * Permissions follow a role change without a reload: a refusal from the
 * server makes the session read the signed-in user again.
 */

type Route = (config: InternalAxiosRequestConfig) => { status: number; data: unknown };

/** Points the real API client at answers this test writes. */
function serve(route: Route) {
  const adapter: AxiosAdapter = async (config) => {
    const { status, data } = route(config);
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, response);
    }
    return response;
  };
  api.defaults.adapter = adapter;
}

const originalAdapter = api.defaults.adapter;

function Probe() {
  const { user } = useAuth();
  return <p data-testid="permissions">{user ? (user.permissions ?? []).join(',') : 'signed out'}</p>;
}

const signedIn = (permissions: string[]): UserResponse => makeUser({ roleId: 'r-1', permissions });

beforeEach(() => {
  localStorage.clear();
  resetActiveTenantForTests();
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  tokenStore.clear();
  resetActiveTenantForTests();
  vi.restoreAllMocks();
});

describe('the API client', () => {
  it('announces a refusal the screen did not expect', async () => {
    const heard = vi.fn();
    window.addEventListener(ACCESS_DENIED_EVENT, heard);
    serve(() => ({ status: 403, data: { code: 'ACCESS_DENIED', message: 'Access denied' } }));

    await expect(api.get('/roles')).rejects.toBeInstanceOf(AxiosError);
    expect(heard).toHaveBeenCalledTimes(1);

    // A refusal that is about the account, not its permissions, is not one.
    serve(() => ({ status: 403, data: { code: 'ACCOUNT_LOCKED', message: 'Locked' } }));
    await expect(api.get('/roles')).rejects.toBeInstanceOf(AxiosError);
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(ACCESS_DENIED_EVENT, heard);
  });
});

describe('the session', () => {
  it('reads the user again after a refusal, once for a burst of them', async () => {
    let meCalls = 0;
    serve((config) => {
      if (config.url === '/auth/refresh') {
        return {
          status: 200,
          data: { accessToken: 'a-1', refreshToken: 'r-2', tokenType: 'Bearer', user: signedIn(['team.view']) },
        };
      }
      if (config.url === '/auth/me') {
        meCalls += 1;
        return { status: 200, data: signedIn(['team.view', 'roles.manage']) };
      }
      return { status: 404, data: {} };
    });
    tokenStore.setRefreshToken('r-1');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('permissions')).toHaveTextContent('team.view'));

    act(() => {
      window.dispatchEvent(new Event(ACCESS_DENIED_EVENT));
      window.dispatchEvent(new Event(ACCESS_DENIED_EVENT));
      window.dispatchEvent(new Event(ACCESS_DENIED_EVENT));
    });

    await waitFor(() => expect(screen.getByTestId('permissions')).toHaveTextContent('team.view,roles.manage'));
    expect(meCalls).toBe(1);
  });

  it('does nothing for a refusal while signed out', async () => {
    let meCalls = 0;
    serve((config) => {
      if (config.url === '/auth/me') meCalls += 1;
      return { status: 404, data: {} };
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('permissions')).toHaveTextContent('signed out'));

    act(() => {
      window.dispatchEvent(new Event(ACCESS_DENIED_EVENT));
    });

    expect(meCalls).toBe(0);
  });
});

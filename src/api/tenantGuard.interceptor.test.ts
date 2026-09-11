import axios, { type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeTenant,
  resetActiveTenantForTests,
  TENANT_MISMATCH_EVENT,
  type TenantMismatchDetail,
} from '../tenant/activeTenant';
import { TenantMismatchError, tenantGuardInterceptor } from './tenantGuard';

const ACTIVE = 't-acme';
const FOREIGN = 't-globex';

/** An axios instance whose responses we author, carrying only the guard. */
function clientReturning(data: unknown) {
  const adapter: AxiosAdapter = async (config) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
  const client = axios.create({ adapter });
  client.interceptors.response.use(tenantGuardInterceptor);
  return client;
}

/** Resolves with the mismatch detail, or null if none fires before `run`. */
function captureMismatch(): { detail: TenantMismatchDetail | null; stop: () => void } {
  const captured: { detail: TenantMismatchDetail | null; stop: () => void } = {
    detail: null,
    stop: () => window.removeEventListener(TENANT_MISMATCH_EVENT, listener),
  };
  const listener = (event: Event) => {
    captured.detail = (event as CustomEvent<TenantMismatchDetail>).detail;
  };
  window.addEventListener(TENANT_MISMATCH_EVENT, listener);
  return captured;
}

beforeEach(() => {
  localStorage.clear();
  resetActiveTenantForTests();
  activeTenant.set(ACTIVE);
});

afterEach(() => {
  resetActiveTenantForTests();
  vi.restoreAllMocks();
});

describe('tenantGuardInterceptor', () => {
  it('passes a response belonging to the active workspace', async () => {
    const client = clientReturning({ id: 'u-1', tenantId: ACTIVE });
    await expect(client.get('/team')).resolves.toMatchObject({ status: 200 });
  });

  it('rejects a response belonging to another workspace', async () => {
    const client = clientReturning({ id: 'u-1', tenantId: FOREIGN });
    await expect(client.get('/team')).rejects.toBeInstanceOf(TenantMismatchError);
  });

  it('announces the mismatch so the session can be ended', async () => {
    const captured = captureMismatch();
    const client = clientReturning({ id: 'u-1', tenantId: FOREIGN });

    await expect(client.get('/team')).rejects.toThrow();

    expect(captured.detail).toEqual({ expected: ACTIVE, received: FOREIGN, path: '/team' });
    captured.stop();
  });

  it('exempts auth endpoints, which are what establish the workspace', async () => {
    const client = clientReturning({ accessToken: 'a', user: { tenantId: FOREIGN } });
    await expect(client.post('/auth/login')).resolves.toMatchObject({ status: 200 });
  });

  it('is inert before a workspace is stamped', async () => {
    activeTenant.clear();
    const client = clientReturning({ id: 'u-1', tenantId: FOREIGN });
    await expect(client.get('/team')).resolves.toMatchObject({ status: 200 });
  });

  it('leaves a backend that echoes no tenantId completely unaffected', async () => {
    const captured = captureMismatch();
    const client = clientReturning({ content: [{ id: 'j-1', title: 'UX Designer' }] });

    await expect(client.get('/public/jobs')).resolves.toMatchObject({ status: 200 });

    expect(captured.detail).toBeNull();
    captured.stop();
  });
});

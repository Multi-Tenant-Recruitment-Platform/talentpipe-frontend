import { beforeEach, describe, expect, it } from 'vitest';
import { purgeForeignTenantKeys, tenantStorage } from './tenantStorage';

const REFRESH_TOKEN_KEY = 'talentpipe.refreshToken';

beforeEach(() => localStorage.clear());

describe('tenantStorage', () => {
  it('namespaces every key under its tenant', () => {
    tenantStorage('t-a').set('notifications.seen', 'true');
    expect(localStorage.getItem('talentpipe.tenant.t-a.notifications.seen')).toBe('true');
  });

  it('keeps one workspace’s values invisible to another', () => {
    tenantStorage('t-a').set('notifications.seen', 'true');
    expect(tenantStorage('t-b').get('notifications.seen')).toBeNull();
  });

  it('no-ops for a user without a tenant, so candidates need no null checks', () => {
    const store = tenantStorage(null);
    store.set('notifications.seen', 'true');
    expect(store.get('notifications.seen')).toBeNull();
    expect(localStorage).toHaveLength(0);
  });

  it('removes what it wrote', () => {
    const store = tenantStorage('t-a');
    store.set('k', 'v');
    store.remove('k');
    expect(store.get('k')).toBeNull();
  });
});

describe('purgeForeignTenantKeys', () => {
  beforeEach(() => {
    tenantStorage('t-a').set('notifications.seen', 'true');
    tenantStorage('t-a').set('other', '1');
    tenantStorage('t-b').set('notifications.seen', 'true');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-me');
    localStorage.setItem('unrelated.key', 'keep');
  });

  it('evicts the previous tenant and keeps the active one', () => {
    expect(purgeForeignTenantKeys('t-a')).toBe(1);
    expect(tenantStorage('t-a').get('notifications.seen')).toBe('true');
    expect(tenantStorage('t-a').get('other')).toBe('1');
    expect(tenantStorage('t-b').get('notifications.seen')).toBeNull();
  });

  it('clears every workspace when there is no active tenant', () => {
    expect(purgeForeignTenantKeys(null)).toBe(3);
    expect(tenantStorage('t-a').get('notifications.seen')).toBeNull();
    expect(tenantStorage('t-b').get('notifications.seen')).toBeNull();
  });

  it('never touches the refresh token — it belongs to the new session', () => {
    purgeForeignTenantKeys(null);
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-me');
  });

  it('leaves keys outside the namespace alone', () => {
    purgeForeignTenantKeys(null);
    expect(localStorage.getItem('unrelated.key')).toBe('keep');
  });
});

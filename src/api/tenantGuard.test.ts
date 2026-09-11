import { describe, expect, it } from 'vitest';
import { findForeignTenantId } from './tenantGuard';

const ACTIVE = 't-acme';
const FOREIGN = 't-globex';

describe('findForeignTenantId', () => {
  it('passes a payload belonging to the active workspace', () => {
    expect(findForeignTenantId({ id: 'u-1', tenantId: ACTIVE }, ACTIVE)).toBeNull();
  });

  it('catches a foreign tenantId at the top level', () => {
    expect(findForeignTenantId({ id: 'u-1', tenantId: FOREIGN }, ACTIVE)).toBe(FOREIGN);
  });

  it('catches one nested under .user (the AuthResponse shape)', () => {
    const payload = { accessToken: 'a', user: { id: 'u-1', tenantId: FOREIGN } };
    expect(findForeignTenantId(payload, ACTIVE)).toBe(FOREIGN);
  });

  it('catches one member of a team list', () => {
    const payload = [
      { id: 'u-1', tenantId: ACTIVE },
      { id: 'u-2', tenantId: FOREIGN },
    ];
    expect(findForeignTenantId(payload, ACTIVE)).toBe(FOREIGN);
  });

  it('catches one inside a paginated envelope', () => {
    const payload = { content: [{ id: 'j-1', tenantId: FOREIGN }], page: 0, totalElements: 1 };
    expect(findForeignTenantId(payload, ACTIVE)).toBe(FOREIGN);
  });

  it('treats a null tenantId as clean, so candidates are never tripped', () => {
    expect(findForeignTenantId({ id: 'u-1', tenantId: null }, ACTIVE)).toBeNull();
  });

  it('fails OPEN when the payload carries no tenantId at all', () => {
    const payload = { content: [{ id: 'j-1', title: 'UX Designer' }] };
    expect(findForeignTenantId(payload, ACTIVE)).toBeNull();
  });

  it('is inert when no workspace is active', () => {
    expect(findForeignTenantId({ tenantId: FOREIGN }, null)).toBeNull();
  });

  it.each([['a string'], [42], [null], [undefined], [true]])('ignores the scalar %s', (payload) => {
    expect(findForeignTenantId(payload, ACTIVE)).toBeNull();
  });

  it('stops descending past the bounded depth', () => {
    // user → user → user → user is one level deeper than the guard looks.
    const deep = { user: { user: { user: { user: { tenantId: FOREIGN } } } } };
    expect(findForeignTenantId(deep, ACTIVE)).toBeNull();

    const reachable = { user: { user: { tenantId: FOREIGN } } };
    expect(findForeignTenantId(reachable, ACTIVE)).toBe(FOREIGN);
  });

  it('does not descend into keys outside the whitelist', () => {
    expect(findForeignTenantId({ metadata: { tenantId: FOREIGN } }, ACTIVE)).toBeNull();
  });
});

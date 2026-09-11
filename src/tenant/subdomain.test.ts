import { beforeEach, describe, expect, it } from 'vitest';
import {
  isValidSubdomain,
  normalizeSubdomainInput,
  recallSubdomain,
  rememberSubdomain,
  resolveTenantHost,
  slugifySubdomain,
} from './subdomain';

describe('resolveTenantHost', () => {
  it.each([
    ['acme.talentpipe.io', 'acme'],
    ['ACME.TalentPipe.IO', 'acme'],
    ['acme.talentpipe.io.', 'acme'], // trailing dot is legal in DNS
    ['big-corp-lk.talentpipe.io', 'big-corp-lk'],
    ['acme.localhost', 'acme'], // dev affordance
  ])('reads the workspace out of %s', (host, expected) => {
    expect(resolveTenantHost(host)).toEqual({ subdomain: expected, locked: true });
  });

  it.each([
    ['localhost', 'the dev server has no subdomain'],
    ['127.0.0.1', 'an IP names no workspace'],
    ['talentpipe.io', 'the apex is the platform, not a tenant'],
    ['www.talentpipe.io', 'reserved label'],
    ['api.talentpipe.io', 'reserved label'],
    ['app.talentpipe.io', 'reserved label'],
    ['a.b.talentpipe.io', 'a multi-level prefix is not a workspace we can name'],
    ['example.com', 'a host outside the root domain'],
    ['', 'no host at all'],
  ])('stays neutral for %s (%s)', (host) => {
    expect(resolveTenantHost(host)).toEqual({ subdomain: null, locked: false });
  });
});

describe('slugifySubdomain', () => {
  it.each([
    ['Acme Corp. (LK)', 'acme-corp-lk'],
    ['  Spaced  Out  ', 'spaced-out'],
    ['Ünïcodé Ltd', 'unicode-ltd'],
    ['---dashes---', 'dashes'],
    ['', ''],
  ])('turns %s into %s', (input, expected) => {
    expect(slugifySubdomain(input)).toBe(expected);
  });

  it('never exceeds a DNS label', () => {
    expect(slugifySubdomain('a'.repeat(200))).toHaveLength(63);
  });
});

describe('normalizeSubdomainInput', () => {
  it('drops anything a hostname cannot contain', () => {
    expect(normalizeSubdomainInput('Ac me!.io')).toBe('acmeio');
    expect(normalizeSubdomainInput('ACME')).toBe('acme');
    expect(normalizeSubdomainInput('a-b-1')).toBe('a-b-1');
  });
});

describe('isValidSubdomain', () => {
  it('accepts a plain label', () => {
    expect(isValidSubdomain('acme')).toBe(true);
    expect(isValidSubdomain('a-b')).toBe(true);
  });

  it('rejects reserved labels and malformed input', () => {
    expect(isValidSubdomain('www')).toBe(false);
    expect(isValidSubdomain('-acme')).toBe(false);
    expect(isValidSubdomain('acme-')).toBe(false);
    expect(isValidSubdomain('a.b')).toBe(false);
    expect(isValidSubdomain('')).toBe(false);
  });
});

describe('remembering the last workspace', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips so a returning user does not retype it', () => {
    rememberSubdomain('acme');
    expect(recallSubdomain()).toBe('acme');
  });

  it('returns an empty string when nothing was stored', () => {
    expect(recallSubdomain()).toBe('');
  });

  it('does not store a blank value over a good one', () => {
    rememberSubdomain('acme');
    rememberSubdomain('');
    expect(recallSubdomain()).toBe('acme');
  });
});

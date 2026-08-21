/**
 * Resolves the workspace ("tenant") from the browser host.
 *
 * <p>Deployed at acme.talentpipe.io the host <em>is</em> the workspace, so the
 * login form locks the field and shows it as a chip. On localhost:5173 — and
 * on the apex domain — there is no subdomain to read, so the user types one.
 * Every caller must treat a null subdomain as "ask the user" rather than as an
 * error.</p>
 */

export const ROOT_DOMAIN = (import.meta.env.VITE_APP_ROOT_DOMAIN ?? 'talentpipe.io').toLowerCase();

/** Hosts that are the platform itself and can never be a workspace. */
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'staging', 'preview', 'localhost']);

/** A single DNS label: lowercase alphanumerics and inner hyphens, ≤63 chars. */
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export interface TenantHost {
  /** Workspace detected from the URL, or null when the host is neutral. */
  subdomain: string | null;
  /** True when the host fixes the workspace → render a read-only chip. */
  locked: boolean;
}

const NEUTRAL: TenantHost = { subdomain: null, locked: false };

/** 'Acme Corp. (LK)' → 'acme-corp-lk' */
export function slugifySubdomain(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    // Drop the combining marks NFKD just split off, so 'ü' becomes 'u' rather
    // than 'u' plus a diacritic that would turn into a hyphen below.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    // Runs were already collapsed above, so at most one hyphen can sit at
    // either end — matching a single one avoids the backtracking that '-+'
    // costs on a long hyphen run.
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

/** What a keystroke in the workspace field is allowed to become. */
export function normalizeSubdomainInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 63);
}

export function isValidSubdomain(value: string): boolean {
  return LABEL.test(value) && !RESERVED.has(value);
}

/**
 * Reads the workspace out of a hostname. Anything ambiguous — an IP, a bare
 * host, a reserved label, a multi-level subdomain — resolves to neutral, which
 * degrades to a typed field rather than to a wrong tenant.
 */
export function resolveTenantHost(hostname: string = window.location.hostname): TenantHost {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || IPV4.test(host) || host.includes(':')) {
    return NEUTRAL;
  }

  const labels = host.split('.');
  let candidate: string | null = null;
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    candidate = host.slice(0, -(ROOT_DOMAIN.length + 1));
  } else if (labels.length === 2 && labels[1] === 'localhost') {
    // acme.localhost — lets the locked path be exercised in development.
    candidate = labels[0];
  }

  // A multi-level prefix (a.b.talentpipe.io) is not a workspace we can name.
  if (!candidate || candidate.includes('.') || !isValidSubdomain(candidate)) {
    return NEUTRAL;
  }
  return { subdomain: candidate, locked: true };
}

/**
 * The last workspace typed on this device, so a returning user doesn't retype
 * it. Deliberately NOT tenant-namespaced: this is the key that <em>selects</em>
 * the tenant, and it holds no secrets.
 */
const LAST_SUBDOMAIN_KEY = 'talentpipe.lastSubdomain';

export function rememberSubdomain(value: string): void {
  if (value) {
    localStorage.setItem(LAST_SUBDOMAIN_KEY, value);
  }
}

export function recallSubdomain(): string {
  return localStorage.getItem(LAST_SUBDOMAIN_KEY) ?? '';
}

/** Vitest global setup: adds the jest-dom matchers (toBeInTheDocument, …). */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Node 22+ defines its own experimental global `localStorage`, which reads as
 * `undefined` unless the process was started with `--localstorage-file`.
 * Vitest's jsdom environment skips any global that already exists, so jsdom's
 * Storage never lands and every test that touches storage — the per-tenant
 * namespacing, the resend log — dies on "Cannot read properties of undefined".
 * `sessionStorage`, which Node does not define, arrives intact: that asymmetry
 * is the whole bug.
 *
 * <p>Stand a minimal in-memory Storage in its place. No-op on Node versions
 * that never shipped the global, so CI is unaffected either way.</p>
 */
if (!globalThis.localStorage) {
  const entries = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return entries.size;
    },
    key: (index) => Array.from(entries.keys())[index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    clear: () => {
      entries.clear();
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}

// Testing Library only auto-registers cleanup when Vitest's globals are on.
// We use explicit imports instead (so no tsconfig `types` entry is needed),
// which means unmounting between tests is our job — without it every render
// stacks on the last one and queries hit duplicates.
afterEach(cleanup);

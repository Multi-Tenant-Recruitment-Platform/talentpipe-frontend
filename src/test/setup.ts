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

/*
 * Browser APIs antd's internals call that jsdom does not implement. Without
 * these, rendering any antd component that measures or watches layout throws
 * before a single assertion runs.
 */

// Grid/useBreakpoint, Layout.Sider and Drawer. Both listener pairs are needed:
// @rc-component/util probes for the legacy addListener before the modern one.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

// @rc-component/resize-observer (Table), rc-overflow (Tabs, Select, Menu) and
// textarea autosize. The casts are required because a bare class assignment
// does not satisfy the constructor signature under `strict`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver ??=
  IntersectionObserverStub as unknown as typeof IntersectionObserver;

// @rc-component/virtual-list, inside Select's popup.
Element.prototype.scrollIntoView ??= () => {};
window.scrollTo ??= () => {};

// antd measures the scrollbar by asking for a pseudo-element's computed style,
// and jsdom throws "Not implemented" for the two-argument form. It is only a
// measurement — the thrown error is swallowed and the component renders fine —
// but it prints a stack trace for every portal and every table, which would
// bury real failures. Drop the pseudo-element argument instead.
const realGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element, pseudoElement?: string | null) =>
  pseudoElement
    ? realGetComputedStyle(element)
    : realGetComputedStyle(element)) as typeof window.getComputedStyle;

// Testing Library only auto-registers cleanup when Vitest's globals are on.
// We use explicit imports instead (so no tsconfig `types` entry is needed),
// which means unmounting between tests is our job — without it every render
// stacks on the last one and queries hit duplicates.
afterEach(cleanup);

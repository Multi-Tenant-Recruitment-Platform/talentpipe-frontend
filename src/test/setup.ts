/** Vitest global setup: adds the jest-dom matchers (toBeInTheDocument, …). */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-registers cleanup when Vitest's globals are on.
// We use explicit imports instead (so no tsconfig `types` entry is needed),
// which means unmounting between tests is our job — without it every render
// stacks on the last one and queries hit duplicates.
afterEach(cleanup);

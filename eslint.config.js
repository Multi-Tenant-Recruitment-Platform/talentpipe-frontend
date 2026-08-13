import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `coverage` holds the v8 reporter's generated HTML bundle — third-party
  // scripts that are not ours to lint and that fail the parser outright.
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Both of these are held at `warn` deliberately, so `npm run lint`
      // reports them without failing on patterns that predate the rules.
      //
      // set-state-in-effect arrived with eslint-plugin-react-hooks v7 (the
      // React Compiler rule set). It fires on our data-fetching effects
      // (TeamSummaryContext, useCompanyProfile) and on the tenant-change
      // resync in useResendLog. Those are working, tested behaviours; moving
      // them to render-phase derivation or `key` remounting is a real
      // refactor with its own regression risk, not a dependency fix.
      'react-hooks/set-state-in-effect': 'warn',

      // A Fast Refresh ergonomics hint, not a correctness rule. Our context
      // modules intentionally co-locate the Provider with its consumer hook
      // (`TeamSummaryProvider` + `useTeamSummary`), which is the idiomatic
      // React context shape and worth keeping.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Test harnesses export fixtures and helpers by design and are never
    // hot-reloaded, so the Fast Refresh constraint has nothing to say here.
    files: ['src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])

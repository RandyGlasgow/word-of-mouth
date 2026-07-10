import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Pure unit tests: no database, no dev server. Kept in a separate config from
// the integration suite so they run without booting Next or Postgres.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.unit.spec.ts'],
  },
})

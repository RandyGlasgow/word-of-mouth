import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Payload Local API instances share one test database — no parallel files.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
})

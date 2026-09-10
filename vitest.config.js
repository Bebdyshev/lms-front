// Separate from vite.config.js on purpose: the app config loads the PWA plugin and
// generates icons, none of which a pure-function unit test needs.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

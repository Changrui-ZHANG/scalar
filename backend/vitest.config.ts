import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    dir: '../tests/backend',
    include: ['**/*.test.ts'],
    env: {
      DATABASE_URL_TEST:
        process.env.DATABASE_URL_TEST ?? 'postgres://scalar:scalar@127.0.0.1:5433/scalar_test',
    },
  },
})

import { defineConfig } from 'vitest/config'

// Les *.integration.test.ts partagent scalar_test : un seed (TRUNCATE ... CASCADE) viderait les tables d'un autre fichier en cours.
const INTEGRATION_TESTS = '**/*.integration.test.ts'

export default defineConfig({
  test: {
    environment: 'node',
    dir: '../tests/backend',
    env: {
      DATABASE_URL_TEST:
        process.env.DATABASE_URL_TEST ?? 'postgres://scalar:scalar@localhost:5433/scalar_test',
      JWT_SECRET: 'secret-de-test-jamais-utilise-ailleurs-0123456789',
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['**/*.test.ts'], exclude: [INTEGRATION_TESTS] },
      },
      {
        extends: true,
        test: { name: 'integration', include: [INTEGRATION_TESTS], fileParallelism: false },
      },
    ],
  },
})

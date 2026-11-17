import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    dir: '../tests',
    env: {
      DATABASE_URL_TEST:
        process.env.DATABASE_URL_TEST ?? 'postgres://scalar:scalar@localhost:5433/scalar_test',
      JWT_SECRET: 'secret-de-test-jamais-utilise-ailleurs-0123456789',
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['unit/backend/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['integration/backend/**/*.test.ts'],
          // Ces tests partagent scalar_test : un seed (TRUNCATE ... CASCADE) viderait les tables d'un autre fichier en cours.
          fileParallelism: false,
        },
      },
    ],
  },
})

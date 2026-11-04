import { defineConfig } from 'vitest/config'

// Ces fichiers partagent scalar_test : un seed (TRUNCATE ... CASCADE) vide les tables apprenant d'un autre fichier en cours.
const DATABASE_TESTS = [
  'repository/prisma.repository.test.ts',
  'repository/learner.repository.test.ts',
  'database/seed.cli.test.ts',
]

export default defineConfig({
  test: {
    environment: 'node',
    dir: '../tests/backend',
    env: {
      DATABASE_URL_TEST:
        process.env.DATABASE_URL_TEST ?? 'postgres://scalar:scalar@127.0.0.1:5433/scalar_test',
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['**/*.test.ts'], exclude: DATABASE_TESTS },
      },
      {
        extends: true,
        test: { name: 'database', include: DATABASE_TESTS, fileParallelism: false },
      },
    ],
  },
})

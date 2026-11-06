# Tests

`backend/` : tests du backend, même arborescence que `backend/src/`.

- `*.test.ts` : tests **unitaires**, sans base, lancés en parallèle (projet Vitest `unit`).
- `*.integration.test.ts` : tests d'**intégration** sur PostgreSQL, lancés un par un car ils
  partagent la base de test (projet Vitest `integration`). Seul Piston y est simulé.

```bash
npm test --workspace backend                    # tous les tests
npm run test:unit --workspace backend           # unitaires seulement, sans base
npm run test:integration --workspace backend    # intégration seulement, avec base
npm run test:watch --workspace backend          # relance à chaque modification
npm run test:coverage --workspace backend       # couverture
DATABASE_URL_TEST=... npm test --workspace backend   # autre base de test (défaut : scalar_test du compose, VIDÉE)
```

Les tests d'intégration demandent le PostgreSQL du compose (`docker compose up -d postgres`).
La base de test n'a pas à exister : `prisma migrate deploy`, lancé au démarrage des tests, la crée.

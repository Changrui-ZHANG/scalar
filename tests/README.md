# Tests

`backend/` : tests du backend, même arborescence que `backend/src/`.

```bash
npm test --workspace backend                    # tous les tests
npm run test:watch --workspace backend          # relance à chaque modification
npm run test:coverage --workspace backend       # couverture
DATABASE_URL_TEST=... npm test --workspace backend   # autre base de test (défaut : scalar_test du compose, VIDÉE)
```

Les tests sur base demandent le PostgreSQL du compose (`docker compose up -d postgres`).
La base de test n'a pas à exister : `prisma migrate deploy`, lancé au démarrage des tests, la crée.

# Tests

`backend/` : tests du backend, même arborescence que `backend/src/`.

```bash
npm test --workspace backend                    # tous les tests
npm run test:watch --workspace backend          # relance à chaque modification
npm run test:coverage --workspace backend       # couverture
DATABASE_TESTS=1 npm test --workspace backend   # + PostgreSQL : base migrée, VIDÉE par les tests
```

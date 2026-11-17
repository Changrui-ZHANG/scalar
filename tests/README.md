# Tests

Chaque sous-dossier reproduit l'arborescence du projet, limitée à ce que ce type de test couvre :
le test de `backend/src/service/track.service.ts` est dans `unit/backend/src/service/`.

- `unit/` : tests **unitaires**, sans base ni réseau (backend, admin, frontend, `packages/shared`).
- `integration/` : tests d'**intégration** du backend sur PostgreSQL, lancés un par un car ils
  partagent la base de test. Seul Piston y est simulé.
- `fixtures/` : helpers partagés par les deux (jeux de données, faux hacheur, migration de la base).

Les entités (`backend/src/entity/`) ne se testent jamais.

```bash
npm test                                        # tout le monorepo
npm run test:unit --workspace backend           # unitaires backend, sans base
npm run test:integration --workspace backend    # intégration backend, avec base
npm test --workspace admin                      # unitaires admin (idem frontend, packages/shared)
npm run test:watch --workspace backend          # relance à chaque modification
npm run test:coverage --workspace backend       # couverture
DATABASE_URL_TEST=... npm test --workspace backend   # autre base de test (défaut : scalar_test du compose, VIDÉE)
```

Les tests d'intégration demandent le PostgreSQL du compose (`docker compose up -d postgres`).
La base de test n'a pas à exister : `prisma migrate deploy`, lancé au démarrage des tests, la crée.

# Backend Scalar

API REST (Express 5, Prisma, PostgreSQL) servie sous `http://localhost:8080/api/v1`
derrière Traefik. Le code des apprenants est exécuté par Piston, isolé et sans réseau.

Toutes les réponses ont la même forme : `{ "success": bool, "data": …, "error": "message" | null }`.

## Lancer

```bash
docker compose up -d                                         # depuis la racine du dépôt
curl http://localhost:8080/api/v1/health                     # {"status":"ok",…,"database":"connected"}
```

Au premier démarrage, le backend applique les migrations et charge le contenu si la base
est vide. Pour repartir d'un contenu propre (avant une démo, ou après une modification de
`src/content/`) :

```bash
docker compose exec backend npm run db:seed --workspace backend
```

Si le backend répond `502` après l'ajout d'une dépendance, l'image est périmée :

```bash
docker compose up -d --build --renew-anon-volumes backend
```

## Routes

| Méthode | Route                                                  | Rôle                                                           |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| GET     | `/health`                                              | état de l'API, de la base                                      |
| GET     | `/tracks`                                              | parcours                                                       |
| GET     | `/tracks/:track`                                       | un parcours et ses chapitres                                   |
| GET     | `/tracks/:track/chapters/:chapter/lessons/:lesson`     | une leçon                                                      |
| GET     | `/tracks/:track/chapters/:chapter/exercises/:exercise` | un exercice, sans sa solution                                  |
| POST    | `…/exercises/:exercise/verifications`                  | corrige un code : verdict par cas de test                      |
| POST    | `/executions`                                          | exécute un code JavaScript ou TypeScript                       |
| GET     | `/questionnaire`                                       | questionnaire de positionnement                                |
| POST    | `/questionnaire/exercises/:questionId/verifications`   | essaie un exercice du questionnaire                            |
| POST    | `/questionnaire/results`                               | calcule le niveau, propose un parcours, enregistre le résultat |
| POST    | `/learners`                                            | crée un apprenant anonyme et renvoie son `id`                  |
| GET     | `/learners/:id/progress`                               | exercices tentés : essais, réussite, dates                     |

Les quatre routes `POST` qui exécutent du code partagent une limite : `EXECUTION_RATE_LIMIT`
requêtes par minute et par adresse IP (30 par défaut), puis `429` avec `Retry-After`.

Une vérification envoyée avec l'en-tête `X-Learner-Id: <id>` est enregistrée dans la
progression de cet apprenant ; sans l'en-tête, rien n'est enregistré.

## Démonstration

`demo/scenario.http` rejoue l'API dans l'ordre de la démo : contenu, correction d'un
exercice, isolation du moteur, questionnaire, erreurs, progression d'un apprenant. Il s'ouvre avec l'extension VS Code
« REST Client » ou le client HTTP de JetBrains (« Send Request » au-dessus de chaque requête).

Limitation de débit, en une commande (30 fois `200`, puis `429`) :

```bash
for i in $(seq 1 31); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:8080/api/v1/executions \
    -H 'content-type: application/json' -d '{"code":"1"}'
done
```

Ce scénario est une vérification manuelle. Les mêmes comportements sont vérifiés
automatiquement par les tests (`npm test --workspace backend`, voir `tests/README.md`).

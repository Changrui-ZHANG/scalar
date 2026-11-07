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
| GET     | `/learners/:id/progress`                               | dernier positionnement, exercices tentés, certificats          |
| POST    | `/learners/:id/certificates`                           | délivre le certificat d'un parcours entièrement réussi         |
| GET     | `/certificates/:code`                                  | vérification publique d'un certificat                          |
| POST    | `/auth/register`                                       | crée un compte (reprend l'apprenant de `X-Learner-Id`)         |
| POST    | `/auth/login`                                          | ouvre une session (cookie)                                     |
| POST    | `/auth/logout`                                         | ferme la session et révoque tous les jetons du compte          |
| GET     | `/auth/me`                                             | le compte de la session                                        |

Les quatre routes `POST` qui exécutent du code partagent une limite : `EXECUTION_RATE_LIMIT`
requêtes par minute et par adresse IP (30 par défaut), puis `429` avec `Retry-After`.
`POST /learners` a son propre compteur : `LEARNER_CREATION_RATE_LIMIT` (10 par défaut).

Une vérification ou un questionnaire envoyé avec l'en-tête `X-Learner-Id: <id>` est
enregistré pour cet apprenant ; sans l'en-tête, il l'est pour le compte connecté, sinon pour
personne.

### Compte

La session est un JWT dans un cookie `HttpOnly` (illisible par le JavaScript de la page, donc
pas volé par un XSS) et `SameSite=Strict` (jamais envoyé depuis un autre site, donc pas de
CSRF). Mot de passe haché avec argon2id. Le jeton dure une heure et se renouvelle à mi-vie ;
`POST /auth/logout` incrémente `tokenVersion`, ce qui révoque tous les jetons déjà émis.

`POST /auth/register` avec `X-Learner-Id` donne un email et un mot de passe à cet apprenant
anonyme : même identifiant, progression, positionnement et certificats conservés.

Un apprenant anonyme reste accessible par son seul identifiant. Une fois inscrit, ses routes
(`/learners/:id/…`, `X-Learner-Id`) exigent sa session : `401` sans session, `403` avec
celle d'un autre compte.

Connexions et inscriptions ratées : `AUTH_ATTEMPTS_LIMIT` par adresse IP et par email sur
15 minutes (10 par défaut), puis `429`. Une réussite ne compte pas.

Variables : `JWT_SECRET` (obligatoire, 32 caractères au moins), `AUTH_COOKIE_SECURE`
(`true` par défaut ; `false` pour un site servi en http, comme le compose).

Un certificat n'est délivré (`201`) que si tous les exercices publiés du parcours sont réussis
(`403` sinon). Redemandé, il est renvoyé tel quel (`200`) : le nom affiché est figé.

## Démonstration

`demo/scenario.http` rejoue l'API dans l'ordre de la démo : contenu, correction d'un
exercice, isolation du moteur, questionnaire, erreurs, progression d'un apprenant, certificat,
compte. Il s'ouvre avec l'extension VS Code « REST Client » (« Send Request » au-dessus de
chaque requête) : les requêtes 18 à 29 et 31 à 38 réutilisent l'apprenant créé en 17.

Limitation de débit, en une commande (30 fois `200`, puis `429`) :

```bash
for i in $(seq 1 31); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:8080/api/v1/executions \
    -H 'content-type: application/json' -d '{"code":"1"}'
done
```

Ce scénario est une vérification manuelle. Les mêmes comportements sont vérifiés
automatiquement par les tests (`npm test --workspace backend`, voir `tests/README.md`).

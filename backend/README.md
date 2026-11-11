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
| GET     | `/admin/tracks`                                        | admin : tous les parcours, brouillons compris                  |
| POST    | `/admin/tracks`                                        | admin : crée un parcours (en brouillon)                        |
| GET     | `/admin/tracks/:trackId`                               | admin : un parcours                                            |
| PATCH   | `/admin/tracks/:trackId`                               | admin : modifie ou publie un parcours                          |
| DELETE  | `/admin/tracks/:trackId`                               | admin : supprime un parcours jamais publié et vide             |
| GET     | `/admin/tracks/:trackId/chapters`                      | admin : ses chapitres, brouillons compris                      |
| POST    | `/admin/tracks/:trackId/chapters`                      | admin : crée un chapitre (en brouillon)                        |
| GET     | `/admin/tracks/:trackId/chapters/:chapterId`           | admin : un chapitre                                            |
| PATCH   | `/admin/tracks/:trackId/chapters/:chapterId`           | admin : modifie, change de niveau ou publie un chapitre        |
| DELETE  | `/admin/tracks/:trackId/chapters/:chapterId`           | admin : supprime un chapitre jamais publié et vide             |
| GET     | `/admin/chapters/:chapterId/exercises`                 | admin : ses exercices, avec solution et cas cachés             |
| POST    | `/admin/chapters/:chapterId/exercises`                 | admin : crée un exercice (en brouillon) et ses cas de test     |
| GET     | `/admin/exercises/:exerciseId`                         | admin : un exercice                                            |
| PATCH   | `/admin/exercises/:exerciseId`                         | admin : modifie ou publie un exercice                          |
| DELETE  | `/admin/exercises/:exerciseId`                         | admin : supprime un exercice jamais publié                     |
| POST    | `/admin/exercises/:exerciseId/solution-check`          | admin : passe la solution dans ses cas de test                 |
| POST    | `/admin/exercises/:exerciseId/verifications`           | admin : essaie un code comme un apprenant, rien d'enregistré   |

Les six routes `POST` qui exécutent du code partagent une limite : `EXECUTION_RATE_LIMIT`
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

Connexions et inscriptions ratées, sur 15 minutes, puis `429` (une réussite ne compte pas) :
trois compteurs qui s'appliquent ensemble.

| Variable                      | Compte les échecs                           | Défaut | Contre                              |
| ----------------------------- | ------------------------------------------- | ------ | ----------------------------------- |
| `AUTH_ATTEMPTS_LIMIT`         | d'une adresse IP sur un email               | 10     | l'essai de mots de passe            |
| `AUTH_IP_ATTEMPTS_LIMIT`      | d'une adresse IP, tous emails confondus     | 30     | le _password spraying_              |
| `AUTH_ACCOUNT_ATTEMPTS_LIMIT` | sur un email, toutes adresses IP confondues | 20     | une attaque depuis de nombreuses IP |

Le compteur par email permet à un attaquant de bloquer un compte visé pendant 15 minutes au
plus : c'est le prix d'une protection contre une attaque distribuée.

Variables : `JWT_SECRET` (obligatoire, 32 caractères au moins), `AUTH_COOKIE_SECURE`
(`true` par défaut ; `false` pour un site servi en http, comme le compose).

Un certificat n'est délivré (`201`) que si tous les exercices publiés du parcours sont réussis
(`403` sinon). Redemandé, il est renvoyé tel quel (`200`) : le nom affiché est figé.

### Administration

Toute route `/admin/*` exige la session d'un compte `admin` : `401` sans session, `403` pour
un apprenant. L'API ne donne jamais ce rôle ; on promeut un compte déjà inscrit :

```bash
docker compose exec backend npm run admin:promote --workspace backend -- admin@scalar.local
```

Les routes admin désignent parcours et chapitres par leur `id` (le slug peut changer tant que
le contenu n'est pas publié). Règles :

- création toujours en brouillon, placée à la fin (des parcours, ou du niveau du chapitre) ;
- un chapitre qui change de niveau passe à la fin de son nouveau niveau ;
- `"status": "published"` date la première publication ; dès lors le slug est figé (`409`)
  et la suppression interdite (`409` : on archive) ;
- suppression refusée tant que du contenu, un certificat ou un positionnement en dépend
  (`409`) ;
- champ invalide ou inconnu : `400` qui le nomme ; slug déjà pris : `409`.

Exercices, en plus de ces règles :

- `testCases` fait partie de l'exercice : la liste envoyée remplace toute la liste, son ordre
  donne les positions ;
- changer `functionName`, `starterCode`, `solutionCode` ou `testCases` remet
  `solutionCheckStatus` à `not_checked` ; renvoyer les mêmes valeurs ne change rien ;
- ces champs sont figés tant que l'exercice est publié (`409`) : on le repasse en brouillon
  d'abord, le titre, la consigne et les indices restent modifiables ;
- `POST …/solution-check` répond `200` avec `passed` et le détail par cas, cas cachés compris,
  et enregistre `passed` ou `failed` ; `409` sans cas de test, `503` si le moteur est
  indisponible (statut inchangé) ;
- `POST …/verifications` avec `{ "code" }` essaie un exercice comme l'apprenant, brouillon
  compris : même verdict que la route publique (cas cachés masqués), rien n'est enregistré ;
  `400` sur un code vide ou un TypeScript illisible, `409` sans cas de test ;
- publication refusée (`409`) tant que le statut n'est pas `passed` ;
- un parcours sans `programmingLanguage` ne peut pas avoir d'exercice (`409`).

`npm run db:seed` remplace tout le contenu, modifications de l'admin comprises.

## Démonstration

`demo/scenario.http` rejoue l'API dans l'ordre de la démo : contenu, correction d'un
exercice, isolation du moteur, questionnaire, erreurs, progression d'un apprenant, certificat,
compte, administration. Il s'ouvre avec l'extension VS Code « REST Client » (« Send Request »
au-dessus de chaque requête) : les requêtes 18 à 29 et 31 à 39 réutilisent l'apprenant créé
en 17. Avant la requête 41, promouvoir le compte admin (commande de la section
Administration).

Limitation de débit, en une commande (30 fois `200`, puis `429`) :

```bash
for i in $(seq 1 31); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:8080/api/v1/executions \
    -H 'content-type: application/json' -d '{"code":"1"}'
done
```

Ce scénario est une vérification manuelle. Les mêmes comportements sont vérifiés
automatiquement par les tests (`npm test --workspace backend`, voir `tests/README.md`).

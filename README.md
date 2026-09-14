# Scalar

Plateforme d'apprentissage du developpement web.

Un test de niveau a l'inscription situe l'apprenant, un parcours lui est
attribue en consequence, ses exercices sont valides par l'execution reelle de
son code dans un environnement isole, et un parcours acheve donne lieu a une
certification verifiable.

## Etat

Projet en cours de demarrage. La conception est arretee ; l'implementation
commence.

Architecture visee : un monorepo npm workspaces reunissant une API Node/Express
sur MongoDB, un executeur de code conteneurise et isole, et un frontend Nuxt,
servis sous une origine unique derriere un reverse proxy.

## Documents

- `Scalar_Presentation.docx` — presentation du produit

## Démarrage

```bash
docker compose up -d                       # Démarre frontend, backend, mongo et traefik
```

Le produit est accessible sur :
- Frontend : http://localhost:8080/
- API Backend : http://localhost:8080/api/v1
- Santé : http://localhost:8080/api/v1/health

## Tests

Les trois verifications tournent sur les trois espaces depuis la racine, et ce
sont exactement celles que la CI lance :

```bash
npm run lint        # eslint ; refuse au front de redeclarer une reponse d'API
npm run typecheck   # types des trois espaces, plus chargement du graphe par Node
npm run test        # vitest
```

`.github/workflows/verification.yml` les rejoue sur chaque push vers `master` et
chaque pull request. Il ne monte aucune base : les cas qui en exigent une s'y
sautent, comme en local.

Un espace a la fois, quand seul celui-la a bouge :

```bash
npm run test --workspace backend       # sans base : les cas qui en exigent une sont sautes
npm run typecheck --workspace backend  # types, plus chargement du graphe d'imports par Node
```

Les cas qui exigent une base reelle ne s'executent que si `MONGODB_URI_TEST` est
definie. Le replica set annonce l'hote `mongo:27017`, donc ils doivent tourner
dans le reseau du compose :

```bash
docker compose run --rm -e MONGODB_URI_TEST='mongodb://mongo:27017/scalar_test?replicaSet=rs0'   backend npm run test --workspace backend
```

La base visee doit porter `test` dans son nom : la suite la supprime en fin de
parcours et refuse de le faire autrement.

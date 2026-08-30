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

## Demarrage

```bash
docker compose up -d mongo mongo-init      # MongoDB en replica set a un noeud
npm run db:index --workspace backend       # cree les index requis (rejouable)
docker compose up -d                       # tout le produit sur http://localhost:8080
```

L'ordre compte. Les index ne sont **jamais** crees implicitement : le backend
verifie au demarrage que les index declares existent et refuse de servir sinon,
en sortant en code non nul et en nommant l'index manquant. Sur un volume neuf,
sauter `db:index` donne donc un backend qui redemarre en boucle.

Sur une pile deja lancee avant l'ajout de l'espace `shared/`, ajouter
`--renew-anon-volumes` a la derniere commande. Le `node_modules` des conteneurs
est un volume anonyme, que Docker Compose conserve d'une recreation a l'autre :
un volume date d'avant ne porte pas le lien vers le nouvel espace, et le rendu
serveur echoue alors sur `Cannot find package '@scalar/shared'`.

`MONGODB_URI` est requise et doit commencer par `mongodb://` ou `mongodb+srv://` ;
le compose la fournit au service `backend`. Aucune valeur par defaut.

Les variables sont chargees par dotenv depuis `backend/.env`, dans
`config/index.ts` — seul lecteur de l'environnement. Un fichier absent n'est pas
une erreur, et une variable deja presente dans l'environnement prime toujours
sur le fichier : sous `docker compose`, ce sont les valeurs du compose qui
gagnent. Copier `backend/.env.example` pour demarrer.

`SECRET_PSEUDONYMISATION` est requise elle aussi, d'au moins 32 caracteres :
c'est la cle HMAC qui pseudonymise l'identite d'un client anonyme avant toute
ecriture — journal, compteur de debit, entree d'audit. Le compose en fournit une
valeur de developpement ; en production elle vient du gestionnaire de secrets,
et deux deploiements qui la partageraient rendraient leurs pseudonymes
comparables. `backend/.env.example` documente les deux.

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

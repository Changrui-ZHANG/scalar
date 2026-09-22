# Scalar

Plateforme d'apprentissage du développement web.

Un test de niveau à l'inscription situe l'apprenant, un parcours lui est
attribué en conséquence, ses exercices sont validés par l'exécution réelle de
son code dans un environnement isolé, et un parcours achevé donne lieu à une
certification vérifiable.

## État

Projet en cours de démarrage. Le monorepo tourne sous `docker compose`, et la
brique fondatrice — **exécuter le code d'un utilisateur et lui en restituer le
résultat** — fonctionne de bout en bout.

Ce qui existe aujourd'hui :

- une page `/exercices` où l'on colle un script Node.js et qui affiche la
  réponse complète du moteur ;
- `POST /api/v1/executions`, qui valide la soumission puis la délègue au moteur ;
- l'exécution isolée par [Piston](https://github.com/engineer-man/piston), avec
  réseau coupé, plafond de durée et plafond de sortie.

Ce qui n'existe pas encore : authentification, comptes, quotas, persistance des
soumissions, notion d'exercice avec énoncé et cas de test, certification. Le
test de niveau et les parcours décrits plus haut restent la cible, pas l'état.

Architecture : un monorepo npm workspaces réunissant une API Node/Express sur
MongoDB, un exécuteur de code conteneurisé et isolé, et un frontend Nuxt,
servis sous une origine unique derrière un reverse proxy.

## Documents

- `Scalar_Presentation.docx` — présentation du produit

## Démarrage

```bash
docker compose up -d      # frontend, backend, mongo, traefik et piston
```

Le produit est accessible sur :
- Frontend : http://localhost:8080/
- API Backend : http://localhost:8080/api/v1
- Santé : http://localhost:8080/api/v1/health

Au tout premier démarrage, le moteur d'exécution n'a aucun langage installé :
voir la section suivante avant d'essayer d'exécuter quoi que ce soit.

> **Après l'ajout d'une dépendance npm**, un `npm install` sur la machine ne
> suffit pas : les conteneurs montent `/app/node_modules` en volume anonyme figé
> à la construction de l'image. Le service redémarre alors en
> `ERR_MODULE_NOT_FOUND` et Traefik répond `502`. Reconstruire en renouvelant ce
> volume :
>
> ```bash
> docker compose up -d --build --renew-anon-volumes backend
> ```

## Moteur d'exécution

Le code soumis par un utilisateur est exécuté par Piston, déclaré comme service
dans `compose.yaml`. Rien ne s'installe sur la machine. Le moteur n'est
joignable que depuis le réseau du compose : Traefik ne l'expose pas, et le
navigateur ne l'appelle jamais.

**L'image Piston n'embarque aucun langage.** Après le tout premier
`docker compose up`, le moteur démarre et ne sait rien exécuter tant que le
runtime Node n'a pas été installé une fois. Le volume `piston-packages` le
conserve ensuite, y compris après un `docker compose down`.

```bash
# 1. Lister les paquets disponibles. Attention : le paquet s'appelle « node »,
#    pas « javascript ».
curl http://127.0.0.1:2000/api/v2/packages

# 2. Installer la version déclarée dans compose.yaml (PISTON_NODE_VERSION)
curl -X POST http://127.0.0.1:2000/api/v2/packages \
  -H 'Content-Type: application/json' \
  -d '{"language":"node","version":"20.11.1"}'

# 3. Vérifier que le runtime est exposé
curl http://127.0.0.1:2000/api/v2/runtimes
```

L'étape 3 doit renvoyer une entrée dont le `language` est **`javascript`** :
c'est sous ce nom, et non `node`, que le runtime est ensuite adressable — le
backend l'appelle ainsi. Tant que la liste est vide, toute soumission échoue, et
le backend le signale par un avertissement à son démarrage.

La version installée doit être **exactement** celle que porte
`PISTON_NODE_VERSION` dans `compose.yaml` : Piston refuse en `400` une version
qu'il ne connaît pas, sans rapport apparent avec le code soumis.

De même, `PISTON_RUN_TIMEOUT` et `PISTON_RUN_CPU_TIME` dans `compose.yaml`
doivent rester alignés sur les limites que le backend demande
(`RUN_TIMEOUT_MS` dans `backend/src/services/execution.service.ts`) : Piston
refuse en `400` toute limite supérieure à sa propre configuration, il ne la
rabote pas.

### Pré-requis de l'hôte

Piston isole les exécutions avec `isolate`, qui exige du noyau **cgroup v2
actif et cgroup v1 désactivé** — c'est pourquoi le service est déclaré
`privileged`. Sous Windows, WSL 2.5.1 et au-delà satisfont ce pré-requis par
défaut (`wsl --version` pour le vérifier). Sur une version antérieure, ajouter
dans `%USERPROFILE%\.wslconfig` puis `wsl --shutdown` :

```ini
[wsl2]
kernelCommandLine = cgroup_no_v1=all systemd.unified_cgroup_hierarchy=1
```

`privileged: true` rend ce conteneur équivalent-root sur l'hôte. C'est `isolate`
qui fait bac à sable, pas Docker : le service ne partage aucun volume avec
MongoDB et son port n'est lié qu'à la boucle locale. À réexaminer avant toute
mise en ligne.

## Tests

Les trois vérifications tournent sur les deux espaces depuis la racine, et ce
sont exactement celles que la CI lance :

```bash
npm run lint        # eslint, frontend uniquement (le backend n'a pas de script lint)
npm run typecheck   # tsc côté backend, nuxt typecheck côté frontend
npm run test        # vitest côté frontend, node --test côté backend
```

`.github/workflows/verification.yml` les rejoue sur chaque push vers `master` et
chaque pull request.

Un espace à la fois, quand seul celui-là a bougé :

```bash
npm run test --workspace backend
npm run typecheck --workspace backend
```

Aucun test du dépôt n'a besoin d'une base de données ni d'un conteneur : la
suite backend couvre la validation des soumissions et la traduction des réponses
du moteur, avec un `fetch` simulé. La vérification de l'exécution réelle se fait
à la main, pile démarrée :

```bash
curl -X POST http://localhost:8080/api/v1/executions \
  -H 'Content-Type: application/json' \
  -d '{"code":"console.log(2 + 3)"}'
```

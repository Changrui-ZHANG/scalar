# Scalar - Plateforme d'apprentissage du développement web

## Description

Un test de niveau à l'inscription situe l'apprenant, un parcours lui est
attribué en conséquence, ses exercices sont validés par l'exécution réelle de
son code dans un environnement isolé, et un parcours achevé donne lieu à une
certification vérifiable.

# Installation

### Backend

### Frontend

### Base de données

## Démarrage

```bash
docker compose up -d      # frontend, backend, postgres, traefik et piston
```

Le produit est accessible sur :
- Frontend : http://localhost:8080/
- API Backend : http://localhost:8080/api/v1
- Santé : http://localhost:8080/api/v1/health

## Tests

### Tests unitaires


```bash
npm run test        # vitest côté frontend, node --test côté backend
```

```bash
npm run lint        # eslint, frontend uniquement (le backend n'a pas de script lint)

npm run typecheck   # tsc côté backend, nuxt 
typecheck côté frontend
```

### Tests d'intégration

### Tests end-to-end



npm run test        # vitest côté frontend, node --test côté backend
```

## Worflows :

### Pull request

### Push

`.github/workflows/verification.yml` les rejoue sur chaque push vers `master` et
chaque pull request.

Un espace à la fois, quand seul celui-là a bougé :

### Pull request

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

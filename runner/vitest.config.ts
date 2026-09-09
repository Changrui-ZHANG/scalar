import { defineConfig } from 'vitest/config'

// Chaque cas cree et detruit un conteneur reel identifie par une seule
// etiquette partagee (`scalar-runner`) : deux fichiers de test executes en
// parallele se voient alors les conteneurs l'un de l'autre, et le controle
// « aucun conteneur ne survit » d'un fichier peut se declencher pendant que
// l'autre est encore en train de detruire le sien. Serialiser les fichiers
// est donc une necessite de ce contrat de test, pas un choix de performance.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
})

// Commande de deploiement : cree les index declares, puis sort. Rejouable sans
// effet. Aucun index n'est cree par le demarrage de l'API.
//
// Le corps est exporte et l'execution gardee par le point d'entree, afin que
// le controle de chargement par Node puisse importer ce fichier : c'est le
// seul chemin de creation des index, et une syntaxe que Node ne peut pas
// effacer n'y serait autrement decouverte qu'au deploiement.
import { pathToFileURL } from 'node:url'
import { chargerConfig } from '../config/index.ts'
import { BaseDonneesService, masquerUri } from '../services/base-donnees.service.ts'

export async function creerIndex(): Promise<number> {
  const config = chargerConfig()
  const baseDonnees = new BaseDonneesService()

  try {
    await baseDonnees.connecter(config.MONGODB_URI)

    const crees = await baseDonnees.creerIndex()

    console.log(JSON.stringify({ niveau: 'info', message: 'index declares en place', index: crees }))

    return 0
  } catch (erreur) {
    console.error(
      JSON.stringify({
        niveau: 'error',
        message: 'creation des index impossible',
        detail: erreur instanceof Error ? masquerUri(erreur.message) : 'cause inconnue',
      }),
    )

    return 1
  } finally {
    // Un echec de deconnexion ne doit pas masquer la cause reelle ni ecraser
    // le code de sortie voulu.
    await baseDonnees.deconnecter().catch(() => undefined)
  }
}

const argument = process.argv[1]

if (argument && import.meta.url === pathToFileURL(argument).href) {
  process.exitCode = await creerIndex()
}

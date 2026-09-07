// Commande de developpement : cree ou met a jour l'unique exercice de
// demonstration que la page racine lie, puis sort. Rejouable sans effet —
// un `slug` deja present est mis a jour, jamais duplique.
//
// Ne remplace pas une commande de seed generale (differee, voir
// `deferred-work.md`) : un seul document, pour que le lien de la page
// racine reponde en developpement tant qu'aucun catalogue n'existe (epic 3).
import { pathToFileURL } from 'node:url'
import { chargerConfig } from '../config/index.ts'
import { BaseDonneesService, masquerUri } from '../services/base-donnees.service.ts'
import { modeleExercise } from '../models/index.ts'

export const SLUG_EXERCICE_DEMO = 'addition-de-deux-nombres'

export async function creerExerciceDemo(): Promise<number> {
  const config = chargerConfig()
  const baseDonnees = new BaseDonneesService()

  try {
    await baseDonnees.connecter(config.MONGODB_URI)

    const exercice = await modeleExercise().findOneAndUpdate(
      { slug: SLUG_EXERCICE_DEMO },
      {
        $set: {
          title: 'Addition de deux nombres',
          statement: 'Ecrivez une fonction qui additionne deux nombres.',
          starterCode: 'function addition(a, b) {}',
          language: 'javascript',
          status: 'published',
          tests: [
            {
              name: 'additionne deux nombres positifs',
              assertion: 'retourne la somme de a et b',
              code: 'expect(addition(2, 3)).toBe(5)',
              hidden: false,
            },
            {
              name: 'gere zero',
              assertion: 'retourne b quand a vaut zero',
              code: 'expect(addition(0, 4)).toBe(4)',
              hidden: false,
            },
            {
              name: 'gere les nombres negatifs',
              assertion: 'retourne une somme correcte avec des negatifs',
              code: 'expect(addition(-2, 3)).toBe(1)',
              hidden: true,
            },
          ],
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    )

    console.log(
      JSON.stringify({
        niveau: 'info',
        message: 'exercice de demonstration en place',
        slug: exercice?.slug,
      }),
    )

    return 0
  } catch (erreur) {
    console.error(
      JSON.stringify({
        niveau: 'error',
        message: 'creation de l exercice de demonstration impossible',
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
  process.exitCode = await creerExerciceDemo()
}

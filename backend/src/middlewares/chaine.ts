import type { RequestHandler } from 'express'
import { ORDRE_CHAINE } from '@scalar/shared/limites.ts'
import type { MaillonChaine } from '@scalar/shared/limites.ts'

export interface Maillon {
  readonly nom: MaillonChaine
  readonly middleware: RequestHandler
}

// Sous-sequence, pas egalite : `session`, `etatCompte` et `role` arrivent aux
// avec l'authentification, et une chaine incomplete reste valide. Ce qui ne l'est pas,
// c'est un maillon avant celui qui doit le preceder — un controle de role place
// avant la session lirait un principal absent et, faute de refus par defaut,
// accorderait l'acces.
export function verifierOrdreChaine(noms: readonly MaillonChaine[]): void {
  let curseur = 0

  for (const nom of noms) {
    const position = ORDRE_CHAINE.indexOf(nom, curseur)

    // -1 couvre les deux fautes : un maillon place trop tot, et un maillon
    // monte deux fois — sa seconde occurrence n'est plus trouvable.
    if (position === -1) {
      throw new Error(
        `Ordre de chaine invalide : « ${noms.join(' → ')} » n'est pas une sous-sequence de ` +
          `« ${ORDRE_CHAINE.join(' → ')} ». Le maillon « ${nom} » est mal place ou monte deux fois.`,
      )
    }

    curseur = position + 1
  }
}

// Leve au montage, donc au demarrage : `construireApp()` echoue et le process
// sort en code non nul avant d'ouvrir le port.
export function assemblerChaine(maillons: readonly Maillon[]): readonly RequestHandler[] {
  // `app.use(...[])` appelle `app.use()` sans handler : Express leve une
  // TypeError dont le message ne nomme pas la cause.
  if (maillons.length === 0) {
    throw new Error("Chaine d'autorisation vide : aucun maillon a monter.")
  }

  verifierOrdreChaine(maillons.map((maillon) => maillon.nom))

  return maillons.map((maillon) => maillon.middleware)
}

import { EN_TETE_TRANSFERT } from '@scalar/shared/proxy.ts'

// Liste fermee. Le rendu serveur appelle le backend pour le compte d'un
// visiteur : il doit lui transmettre sa session et son identite de client, et
// rien de plus. Recopier l'ensemble des en-tetes entrants ferait suivre `host`
// et casserait le routage, et transformerait un jour une en-tete d'autorisation
// en fuite de portee.
//
// Le nom de la chaine de transfert vient du contrat, jamais d'une chaine
// recopiee : le backend resout l'identite de client sur cette meme en-tete, et
// deux orthographes divergentes feraient passer tout appel rendu au serveur
// pour un appel interne, hors des plafonds anonymes.
export const A_PROPAGER = ['cookie', EN_TETE_TRANSFERT] as const

export type EntetesPropagees = Partial<Record<(typeof A_PROPAGER)[number], string>>

export function entetesAPropager(
  entrantes: Readonly<Record<string, string | undefined>>,
): EntetesPropagees {
  const propagees: EntetesPropagees = {}

  for (const nom of A_PROPAGER) {
    const valeur = entrantes[nom]?.trim()

    if (valeur) {
      propagees[nom] = valeur
    }
  }

  return propagees
}

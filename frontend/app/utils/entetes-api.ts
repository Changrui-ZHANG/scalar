// Liste fermee. Le rendu serveur appelle le backend pour le compte d'un
// visiteur : il doit lui transmettre sa session et son identite de client, et
// rien de plus. Recopier l'ensemble des en-tetes entrants ferait suivre `host`
// et casserait le routage, et transformerait un jour une en-tete d'autorisation
// en fuite de portee.
const A_PROPAGER = ['cookie', 'x-forwarded-for'] as const

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

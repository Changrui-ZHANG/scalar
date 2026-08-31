// Chaque fichier de test qui exige une base reelle travaille sur **sa** base,
// derivee de `MONGODB_URI_TEST` par un suffixe. Vitest execute les fichiers en
// parallele : sans cette separation, le `dropDatabase` de l'un effacerait les
// documents que l'autre vient d'ecrire, et l'echec serait intermittent — donc
// attribue au code plutot qu'a la suite.
export function uriDeTest(suffixe: string): string | undefined {
  const base = process.env.MONGODB_URI_TEST

  if (base === undefined || base === '') {
    return undefined
  }

  const url = new URL(base)
  const nom = url.pathname.replace(/^\//, '')

  // Le nom conserve « test » : la garde de nom des `afterAll` refuse de
  // supprimer une base qui ne le porte pas.
  url.pathname = `/${nom === '' ? 'scalar_test' : nom}_${suffixe}`

  return url.toString()
}

// Garde de nom : pointer `MONGODB_URI_TEST` sur une base reelle ne doit pas la
// detruire.
export function verifierBaseDeTest(nom: string): void {
  if (!/test/i.test(nom)) {
    throw new Error(`base « ${nom} » non reconnue comme base de test : abandon avant suppression`)
  }
}

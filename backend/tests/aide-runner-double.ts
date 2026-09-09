import { createServer, type Server } from 'node:http'

// Double du runner (convention Tests : « chaque adaptateur externe expose un
// double, sans quoi l'environnement test sans fournisseur reel n'est pas
// tenable »). Admet tout travail par defaut ; un test qui veut exercer la
// file ou le rejet de forme reaffecte `comportement`.
export interface RunnerDouble {
  readonly url: string
  comportement: (corps: unknown) => { readonly statut: number; readonly corps: unknown }
  appels: unknown[]
  fermer: () => Promise<void>
}

export async function demarrerRunnerDouble(): Promise<RunnerDouble> {
  const serveur: Server = createServer((requete, reponse) => {
    let donnees = ''

    requete.on('data', (morceau: Buffer) => {
      donnees += morceau.toString('utf8')
    })

    requete.on('end', () => {
      const corpsRecu: unknown = donnees.length > 0 ? JSON.parse(donnees) : undefined
      double.appels.push(corpsRecu)

      const { statut, corps } = double.comportement(corpsRecu)
      reponse.writeHead(statut, { 'content-type': 'application/json' })
      reponse.end(JSON.stringify(corps))
    })
  })

  await new Promise<void>((resoudre) => serveur.listen(0, '127.0.0.1', resoudre))
  const adresse = serveur.address()
  const port = typeof adresse === 'object' && adresse !== null ? adresse.port : 0

  const double: RunnerDouble = {
    url: `http://127.0.0.1:${port}`,
    comportement: () => ({ statut: 202, corps: { admis: true } }),
    appels: [],
    fermer: () => new Promise((resoudre) => serveur.close(() => resoudre())),
  }

  return double
}

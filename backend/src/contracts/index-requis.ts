// Source unique des index : la commande de creation et la verification au
// demarrage lisent toutes deux cette liste, jamais une definition dupliquee
// ailleurs. La construction automatique d'index est desactivee partout.
export interface IndexRequis {
  readonly collection: string
  readonly nom: string
  readonly cles: Readonly<Record<string, 1 | -1>>
  readonly unique: boolean
}

export const INDEX_REQUIS: readonly IndexRequis[] = [
  {
    collection: 'utilisateurs',
    nom: 'adresseNormalisee_unique',
    cles: { adresseNormalisee: 1 },
    unique: true,
  },
]

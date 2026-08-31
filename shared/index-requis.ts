// Source unique des index : la commande de creation et la verification au
// demarrage lisent toutes deux cette liste, jamais une definition dupliquee
// ailleurs. La construction automatique d'index est desactivee partout.
export interface IndexRequis {
  readonly collection: string
  readonly nom: string
  readonly cles: Readonly<Record<string, 1 | -1>>
  readonly unique: boolean
  // Delai TTL, en secondes, applique a la date que porte la cle. `0` signifie
  // « des que la date est passee » et n'est donc pas equivalent a l'absence du
  // champ : c'est pour cela qu'il est optionnel plutot que defaut a zero.
  // Un index TTL est un **nettoyage**, jamais un mecanisme d'autorisation : sa
  // granularite est de l'ordre de la minute, et le chemin de lecture d'une
  // session verifie l'expiration lui-meme.
  readonly expireApresSecondes?: number
}

export const INDEX_REQUIS: readonly IndexRequis[] = [
  {
    collection: 'users',
    nom: 'normalizedEmail_unique',
    cles: { normalizedEmail: 1 },
    unique: true,
  },
  // L'unicite du jeton de session n'est pas une precaution contre une
  // collision — 32 octets d'alea n'en produisent pas — mais contre un defaut
  // d'ecriture qui insererait deux documents sur la meme empreinte : la
  // lecture en choisirait alors un au hasard.
  {
    collection: 'sessions',
    nom: 'tokenHash_unique',
    cles: { tokenHash: 1 },
    unique: true,
  },
  {
    collection: 'sessions',
    nom: 'expiresAt_ttl',
    cles: { expiresAt: 1 },
    unique: false,
    expireApresSecondes: 0,
  },
]

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
  // Un exercice se consulte par son slug depuis l'URL : l'unicite empeche que
  // deux documents repondent a la meme adresse, ce que la lecture par slug
  // resoudrait alors au hasard.
  {
    collection: 'exercises',
    nom: 'slug_unique',
    cles: { slug: 1 },
    unique: true,
  },
  // Ferme AD-9 par index, jamais par lecture : une resoumission concurrente sur
  // la meme cle rencontre l'index, pas une fenetre de « lire puis creer ».
  {
    collection: 'submissions',
    nom: 'userId_requestKey_unique',
    cles: { userId: 1, requestKey: 1 },
    unique: true,
  },
  // Meme raisonnement (AD-9) applique au compteur de quota (AD-14) : deux
  // reservations concurrentes sur le meme utilisateur, la meme operation et la
  // meme periode doivent rencontrer un seul document, jamais deux compteurs qui
  // se partageraient le meme plafond au hasard.
  {
    collection: 'quotacounters',
    nom: 'userId_operation_period_unique',
    cles: { userId: 1, operation: 1, period: 1 },
    unique: true,
  },
]

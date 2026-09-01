// Toute limite declaree du backend vit ici. Une valeur en dur ailleurs
// dans le code est une violation, pas un raccourci.
//
// Deux exceptions assumees, et pas une de plus. Le nombre de sauts de proxy de
// confiance vit dans `proxy.ts`, avec le reste de ce que le backend sait de ce
// qui se tient devant lui ; le plancher argon2id vit dans `hachage.ts`, a cote
// de l'algorithme qu'il borne. Dans les deux cas le commentaire n'est lisible
// qu'en contexte. Ni l'un ni l'autre n'est redeclare ici.

// Assez pour un formulaire ou un extrait de code soumis, assez peu pour qu'un
// corps abusif soit refuse avant d'etre mis en memoire.
export const TAILLE_MAX_CORPS = '128kb'

// Chaine d'autorisation imposee. L'ordre est la donnee ; `chaine.ts`
// verifie au demarrage que ce qui est monte en est une sous-sequence. `debit`
// et `session` sont montes globalement ; `etatCompte` et `role` se montent par
// route, et `etatCompte` ne peut pas rejoindre le montage global — il
// refuserait l'inscription elle-meme, faite par un visiteur sans compte.
export const ORDRE_CHAINE = ['debit', 'session', 'etatCompte', 'role'] as const

export type MaillonChaine = (typeof ORDRE_CHAINE)[number]

export interface Plafond {
  readonly fenetreMs: number
  readonly maximum: number
}

// Valeurs de depart, reglables : ce qui est fige, c'est l'endroit ou elles se
// declarent, jamais le chiffre lui-meme.
//
// Portee du compteur, a declarer parce qu'elle est une limite : le magasin est
// celui d'`express-rate-limit` par defaut, donc **en memoire de processus**.
// Avec N instances derriere le proxy le plafond effectif vaut N x maximum, et
// un redemarrage remet tous les compteurs a zero. Tenable tant que le VPS
// n'execute qu'une instance ; le jour ou il y en a deux, c'est un magasin
// partage qu'il faut, pas un chiffre plus bas.

// S'applique a toute route, `/health` compris : aucune n'en est exemptee.
// Large a dessein : une sonde d'orchestrateur ne doit jamais le franchir.
export const PLAFOND_DEFAUT: Plafond = { fenetreMs: 60_000, maximum: 300 }

// Reserve aux routes sensibles : connexion, inscription, demande de
// reinitialisation, verification publique de Certification, catalogue anonyme,
// creation de Soumission.
export const PLAFOND_SENSIBLE: Plafond = { fenetreMs: 900_000, maximum: 10 }

// Voie d'application par route. C'est une **substitution**, pas un cumul : une
// route nommee ici consomme son seau sensible et **ne consomme pas** le seau
// par defaut. L'alternative — un second maillon `debit` monte sur la route —
// echouait deux fois : le decompte devenait double sur exactement les routes
// qu'on voulait resserrer, et ce maillon aurait tourne **apres** `session`,
// alors que le plafond doit s'appliquer avant elle, sur les surfaces anonymes.
//
// Le chemin est celui que porte la requete, prefixe compris, sans chaine de
// requete. La methode est comparee en majuscules.
export interface PlafondDeRoute {
  readonly methode: string
  readonly chemin: string
  readonly plafond: Plafond
}

export const PLAFONDS_PAR_ROUTE: readonly PlafondDeRoute[] = [
  { methode: 'POST', chemin: '/api/v1/accounts', plafond: PLAFOND_SENSIBLE },
  { methode: 'POST', chemin: '/api/v1/sessions', plafond: PLAFOND_SENSIBLE },
]

// Duree de vie absolue d'une session, portee par `expiresAt`. Le chemin de
// lecture la verifie lui-meme : l'index TTL qui balaie la collection a une
// granularite de l'ordre de la minute, et une session expiree resterait donc
// utilisable pendant ce delai si on lui faisait confiance.
export const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000

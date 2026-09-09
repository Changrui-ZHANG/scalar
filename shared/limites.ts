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
  { methode: 'POST', chemin: '/api/v1/submissions', plafond: PLAFOND_SENSIBLE },
]

// Duree de vie absolue d'une session, portee par `expiresAt`. Le chemin de
// lecture la verifie lui-meme : l'index TTL qui balaie la collection a une
// granularite de l'ordre de la minute, et une session expiree resterait donc
// utilisable pendant ce delai si on lui faisait confiance.
export const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000

// Bornes AD-8 du tableau `tests` embarque dans `Exercise` : imposees a
// l'ecrivain du modele, pas relues au bord. Un embarquement non borne devient
// une collection le jour ou il croit avec l'usage — ici il ne croit pas, un
// Exercice a un nombre de tests fixe par son auteur, d'ou une borne stricte
// plutot qu'une pagination.
export const NOMBRE_MAX_TESTS_EXERCICE = 50

// Environ 2 ko par test en moyenne sur 50 tests : assez pour un corps de test
// et son assertion, tres loin de la limite BSON de 16 Mo, et sous la taille
// maximale d'un corps de requete entrant (`TAILLE_MAX_CORPS`) pour qu'un
// exercice cree via l'API ne puisse jamais depasser cette borne autrement
// qu'en la violant explicitement.
export const OCTETS_MAX_TESTS_EXERCICE = 100_000

// Longueur d'une cle de deduplication (AD-7, AD-9) : une chaine opaque
// fournie par l'appelant, jamais interpretee, seulement bornee pour qu'un
// index unique construit dessus ne recoive pas une cle arbitrairement
// longue. Large au regard d'un UUID ou d'un hachage, tres loin de la taille
// maximale d'un corps de requete entrant.
export const LONGUEUR_MAX_CLE_DEDUPLICATION = 128

// Longueur maximale du `code` soumis (AD-7) : assez pour un exercice reel,
// tres loin de la limite BSON, et sous la taille maximale d'un corps de
// requete entrant (`TAILLE_MAX_CORPS`) pour qu'une Soumission creee via l'API
// ne puisse jamais depasser cette borne autrement qu'en la violant
// explicitement.
export const LONGUEUR_MAX_CODE_SOUMISSION = 50_000

// Plafond de quota minimal (AD-14) pour l'operation `executionSandbox` :
// valeurs de depart, reglables comme les plafonds de debit ci-dessus. Ce
// qui est fige, c'est l'endroit ou elles se declarent, jamais le chiffre.
// Fenetre glissante d'un jour plutot qu'une fenetre calendaire : un plafond
// mensuel ou une remise a zero a heure fixe restent hors du perimetre
// minimal construit ici.
export const PLAFOND_QUOTA_SANDBOX: Plafond = { fenetreMs: 24 * 60 * 60 * 1000, maximum: 20 }

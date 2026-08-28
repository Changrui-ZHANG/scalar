// Toute limite declaree du backend vit ici (AD-15). Une valeur en dur ailleurs
// dans le code est une violation, pas un raccourci.
//
// Une exception assumee : le nombre de sauts de proxy de confiance est aussi
// une limite declaree, mais il vit dans `proxy.ts` avec le reste de ce que le
// backend sait de ce qui se tient devant lui, ou son commentaire est lisible
// en contexte. Il n'est pas redeclare ici.

// Assez pour un formulaire ou un extrait de code soumis, assez peu pour qu'un
// corps abusif soit refuse avant d'etre mis en memoire.
export const TAILLE_MAX_CORPS = '128kb'

// Chaine d'autorisation imposee (AD-5). L'ordre est la donnee ; `chaine.ts`
// verifie au demarrage que ce qui est monte en est une sous-sequence. Seul
// `debit` existe aujourd'hui, les trois autres arrivent aux stories 1.7 a 1.9.
export const ORDRE_CHAINE = ['debit', 'session', 'etatCompte', 'role'] as const

export type MaillonChaine = (typeof ORDRE_CHAINE)[number]

export interface Plafond {
  readonly fenetreMs: number
  readonly maximum: number
}

// Valeurs de depart, reglables : l'epine differe les chiffres, pas leur
// emplacement (AD-25).
//
// Portee du compteur, a declarer parce qu'elle est une limite : le magasin est
// celui d'`express-rate-limit` par defaut, donc **en memoire de processus**.
// Avec N instances derriere le proxy le plafond effectif vaut N x maximum, et
// un redemarrage remet tous les compteurs a zero. Tenable tant que le VPS
// n'execute qu'une instance ; le jour ou il y en a deux, c'est un magasin
// partage qu'il faut, pas un chiffre plus bas.

// S'applique a toute route, `/health` compris — AD-25 n'en exempte aucune.
// Large a dessein : une sonde d'orchestrateur ne doit jamais le franchir.
export const PLAFOND_DEFAUT: Plafond = { fenetreMs: 60_000, maximum: 300 }

// Reserve aux routes que AD-25 nomme : connexion, inscription, demande de
// reinitialisation, verification publique de Certification, catalogue anonyme,
// creation de Soumission. Aucune n'existe encore ; la valeur est posee ici pour
// qu'elles la prennent sans en inventer une.
export const PLAFOND_SENSIBLE: Plafond = { fenetreMs: 900_000, maximum: 10 }

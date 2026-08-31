import * as v from 'valibot'

// Le schema d'entree vit ici parce que les deux cotes le lisent : le backend
// pour refuser au bord, le front pour ne pas envoyer une saisie qu'il sait
// deja invalide. Deux schemas separes divergeraient — et c'est le front qui
// aurait tort, en silence.

export const LONGUEUR_MAX_NOM_AFFICHE = 100
export const LONGUEUR_MAX_EMAIL = 254

// Politique de mot de passe. Une longueur minimale, et rien d'autre : les
// regles de composition — une majuscule, un chiffre, un caractere special —
// reduisent l'espace reellement utilise au lieu de l'elargir, et poussent vers
// des mots de passe que leur auteur ne retient pas. Le plafond borne le
// travail de hachage ; il est assez haut pour ne jamais tronquer une phrase
// de passe.
export const LONGUEUR_MIN_MOT_DE_PASSE = 12
export const LONGUEUR_MAX_MOT_DE_PASSE = 128

// L'ecran d'inscription enonce cette politique **avant** la saisie, jamais en
// reaction a un echec. Il la compose depuis ces deux nombres : une phrase
// recopiee a la main cesserait d'etre vraie le jour ou le plancher bouge.

// Canonicalisation d'une adresse : NFKC, retrait des caracteres de largeur
// nulle, puis rognage. Pas de mise en minuscules — c'est l'adresse telle que
// son proprietaire l'ecrit qui est conservee et reaffichee ; la cle d'unicite,
// elle, descend d'un cran de plus.
//
// Elle s'applique **avant** le controle de forme, et c'est ce qui fait la
// difference entre deux comportements. Valider la saisie brute refuse
// « ａlice@… » (« a » pleine largeur) comme une adresse malformee : l'auteur
// recoit une erreur de forme sur une adresse qui, une fois normalisee, est
// simplement deja prise. Valider la forme canonique lui rend le conflit, qui
// est la verite.
export function canoniserEmail(email: string): string {
  return email
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

export const schemaInscription = v.object({
  displayName: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(LONGUEUR_MAX_NOM_AFFICHE)),
  // La borne de longueur s'applique apres la canonicalisation : c'est la forme
  // canonique qui est stockee, et NFKC peut allonger une saisie autant que la
  // raccourcir.
  email: v.pipe(
    v.string(),
    v.transform(canoniserEmail),
    v.maxLength(LONGUEUR_MAX_EMAIL),
    v.email(),
  ),
  // Ni `trim` ni normalisation Unicode : un mot de passe est une suite d'octets
  // choisie par son auteur, et la rogner ferait echouer la connexion suivante
  // chez qui a saisi une espace finale volontaire.
  motDePasse: v.pipe(
    v.string(),
    v.minLength(LONGUEUR_MIN_MOT_DE_PASSE),
    v.maxLength(LONGUEUR_MAX_MOT_DE_PASSE),
  ),
})

export type EntreeInscription = v.InferOutput<typeof schemaInscription>

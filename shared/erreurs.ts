import type { EtatCompte } from './compte.ts'

// Depositaire unique des reponses non-2xx. Un code absent de ce catalogue
// n'existe pas : le middleware terminal ne sait servir que ce qui est declare
// ici, et c'est ce qui empeche une route d'inventer sa propre forme d'erreur
// Les `message` sont servis tels quels : ils vouvoient, disent
// ce qui s'est passe avant quoi faire, sans emoji ni point d'exclamation, et
// ne reprennent aucune formule creuse du type « une erreur est survenue » ni
// aucun code HTTP nu.

export interface Violation {
  readonly chemin: string
  readonly message: string
}

// La forme du corps servi est un contrat, pas un detail du middleware qui
// l'ecrit : le front la consommera. Elle vit donc ici, avec le reste du contrat.
export interface CorpsErreur {
  readonly code: CodeErreur
  readonly message: string
  readonly violations?: readonly Violation[]
  readonly details?: unknown
}

// Une reponse sert au plus ce nombre de violations. Sans borne, un schema de
// tableau sur un corps de 128 ko produit des milliers d'entrees : la reponse
// d'erreur devient plus lourde que la demande qui l'a causee.
export const MAX_VIOLATIONS = 20

// Les messages de violation sont declares ici pour la meme raison que les
// autres : ceux de valibot sont en anglais, decrivent le schema, et rejouent
// la valeur recue — trois choses qui n'ont rien a faire dans une reponse.
// Le `chemin` dit quel champ ; ce texte dit quoi en faire.
export const MESSAGES_VIOLATION = {
  absent: 'Ce champ est obligatoire.',
  type: "Ce champ n'a pas le type attendu.",
  longueur: 'Ce champ ne respecte pas la longueur attendue.',
  valeur: "Ce champ n'accepte pas cette valeur.",
  forme: "Ce champ n'a pas la forme attendue.",
} as const

export type NatureViolation = keyof typeof MESSAGES_VIOLATION

export interface DefinitionErreur {
  readonly statut: number
  readonly message: string
}

export const CODES_ERREUR = {
  ROUTE_INTROUVABLE: {
    statut: 404,
    message: "Cette adresse ne correspond à aucune ressource de l'API. Vérifiez le chemin appelé.",
  },
  REQUETE_INVALIDE: {
    statut: 400,
    message:
      "Votre demande n'a pas la forme attendue. Corrigez les champs indiqués puis renvoyez-la.",
  },
  CORPS_ILLISIBLE: {
    statut: 400,
    message:
      "Le corps de votre demande n'a pas pu être lu comme du JSON. Vérifiez sa syntaxe puis renvoyez-la.",
  },
  CORPS_TROP_VOLUMINEUX: {
    statut: 413,
    message:
      'Le corps de votre demande dépasse la taille maximale acceptée. Réduisez son contenu puis renvoyez-la.',
  },
  DEBIT_DEPASSE: {
    statut: 429,
    message:
      'Vous avez atteint le nombre de demandes autorisées sur cette période. Attendez la réinitialisation indiquée avant de réessayer.',
  },
  ADRESSE_DEJA_UTILISEE: {
    statut: 409,
    message:
      'Cette adresse est déjà associée à un compte. Connectez-vous, ou inscrivez-vous avec une autre adresse.',
  },
  IDENTIFIANTS_INVALIDES: {
    statut: 401,
    message:
      "L'adresse email ou le mot de passe est incorrect. Vérifiez vos identifiants puis réessayez.",
  },
  NON_AUTHENTIFIE: {
    statut: 401,
    message: 'Cette action exige une session active. Connectez-vous puis réessayez.',
  },
  ETAT_COMPTE_INSUFFISANT: {
    statut: 403,
    message:
      "L'état de votre compte ne permet pas encore cette action. Vérifiez votre adresse, puis reprenez où vous en étiez.",
  },
  ORIGINE_REFUSEE: {
    statut: 403,
    message:
      "Votre demande provient d'une origine que ce service ne sert pas. Rechargez la page depuis l'adresse du produit, puis renvoyez-la.",
  },
  EXERCICE_INTROUVABLE: {
    statut: 404,
    message: "Cet exercice n'existe pas ou n'est plus disponible. Vérifiez le lien utilisé.",
  },
  QUOTA_DEPASSE: {
    statut: 429,
    message:
      'Vous avez atteint votre quota pour cette période. Attendez la réinitialisation indiquée avant de réessayer.',
  },
  ERREUR_INTERNE: {
    statut: 500,
    message: "Le serveur n'a pas pu traiter votre demande. Réessayez dans quelques instants.",
  },
} as const satisfies Record<string, DefinitionErreur>

export type CodeErreur = keyof typeof CODES_ERREUR

// La forme de `details` est typee **par** code. Un code absent de cette
// carte n'en porte pas, et le type ci-dessous refuse alors d'en recevoir : y
// ajouter une entree est un changement de contrat, pas un detail d'appel.
export interface DetailsParCode {
  DEBIT_DEPASSE: {
    readonly maximum: number
    readonly fenetreSecondes: number
    readonly reinitialisationA: string
  }
  // L'etat courant et l'etat exige, parce qu'une surface doit pouvoir dire
  // laquelle des situations du compte bloque — « verifiez votre adresse » et
  // « votre compte est suspendu » n'appellent pas la meme suite. Aucun autre
  // champ : ce refus se produit sur une session deja resolue, donc l'appelant
  // n'apprend rien qu'il ne sache de son propre compte.
  ETAT_COMPTE_INSUFFISANT: {
    // Optionnel, et non rempli par une valeur de repli : un appelant sans
    // session n'a pas d'etat courant, et lui en inventer un — « efface », par
    // exemple — ferait servir une information fausse plutot qu'absente.
    readonly etatCourant?: EtatCompte
    readonly etatExige: EtatCompte
  }
  // Meme esprit que `DEBIT_DEPASSE` : le plafond touche et l'instant de
  // reinitialisation, pour que l'appelant sache combien de temps attendre.
  // Pas de `fenetreSecondes` ici — la fenetre d'un quota n'est pas une donnee
  // que l'appelant a besoin de connaitre pour agir, contrairement au debit.
  QUOTA_DEPASSE: {
    readonly maximum: number
    readonly reinitialisationA: string
  }
}

// `ADRESSE_DEJA_UTILISEE` et `ORIGINE_REFUSEE` ne portent pas de `details`, et
// leur absence de cette carte est ce qui l'interdit au constructeur. Pour le
// premier c'est delibere : le `code` dit deja que l'adresse est prise, y
// ajouter le moindre champ n'aiderait personne d'autre qu'un enumerateur.

export type DetailsDe<C extends CodeErreur> = C extends keyof DetailsParCode
  ? DetailsParCode[C]
  : undefined

type OptionsErreur<C extends CodeErreur> = {
  readonly violations?: readonly Violation[]
} & (C extends keyof DetailsParCode
  ? { readonly details: DetailsParCode[C] }
  : { readonly details?: undefined })

// Deux surcharges plutot qu'un parametre optionnel : un defaut `= {} as ...`
// rendrait `new ErreurApi('DEBIT_DEPASSE')` compilable et la contrainte
// « details types **par** code » purement decorative.
type CodeSansDetails = Exclude<CodeErreur, keyof DetailsParCode>

// Porteuse, sans comportement : elle transporte un code declare jusqu'au
// terminal, qui seul decide du statut et du corps. Le `message` d'Error reste
// interne — celui qui est servi vient du catalogue, jamais d'une exception.
export class ErreurApi<C extends CodeErreur = CodeErreur> extends Error {
  readonly code: C
  readonly violations: readonly Violation[] | undefined
  readonly details: DetailsDe<C> | undefined

  constructor(code: CodeSansDetails & C, options?: OptionsErreur<C>)
  constructor(code: C, options: OptionsErreur<C>)
  constructor(code: C, options: OptionsErreur<C> = {} as OptionsErreur<C>) {
    super(code)
    this.name = 'ErreurApi'
    this.code = code
    this.violations = options.violations
    this.details = options.details as DetailsDe<C> | undefined
  }
}

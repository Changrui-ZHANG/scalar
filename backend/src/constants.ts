import type { ChapterLevel, ProgrammingLanguage } from '@scalar/shared/enums'

// Exécution

export const PISTON_LANGUAGE = 'javascript'

export const MAX_CODE_BYTES = 64 * 1024

// L'echappement JSON grossit un octet jusqu'a 6 (\u0001) : en dessous, un code valide est refuse en 413 avant d'atteindre son controle de taille.
export const MAX_BODY_BYTES = 6 * MAX_CODE_BYTES + 1024

// Doit rester egal a PISTON_RUN_TIMEOUT et PISTON_RUN_CPU_TIME (compose.yaml) : au-dela, Piston refuse toutes les executions en 400.
export const RUN_TIMEOUT_MS = 5_000

// Fenetre des limites *_RATE_LIMIT : elles se lisent « par minute et par adresse IP ».
export const RATE_LIMIT_WINDOW_MS = 60_000

// Identifiant d'apprenant anonyme : sans lui, une verification n'est pas enregistree.
export const LEARNER_HEADER = 'x-learner-id'

export const PROGRAMMING_LANGUAGES = [
  'javascript',
  'typescript',
] as const satisfies readonly ProgrammingLanguage[]

export const EXECUTION_STATUS_LABELS = {
  OK: 'Terminé',
  TO: 'Temps dépassé',
  OL: 'Sortie tronquée',
  EL: 'Sortie d’erreur tronquée',
  RE: 'Erreur d’exécution',
  SG: 'Interrompu par un signal',
  XX: 'Erreur interne du moteur',
} as const

// Correction

export const FUNCTION_NAME_PATTERN = /^[A-Za-z_$][\w$]*$/

// Contenu

export const PUBLISHED = 'published' as const

export const ORDER_BY_POSITION = { position: 'asc' } as const

// Ordre de l'enum en base.
export const CHAPTER_LEVELS: readonly ChapterLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'ecosystem',
]

// Minuscules, chiffres et tirets isoles : le slug finit dans l'URL publique.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const QUESTIONNAIRE_QUESTION_KINDS = ['experience', 'language', 'knowledge', 'code'] as const

// La somme doit rester 1 : le score final est sur 100.
export const QUESTIONNAIRE_WEIGHTS = { declared: 0.2, knowledge: 0.2, practical: 0.6 } as const

export const QUESTIONNAIRE_THRESHOLDS = { intermediate: 40, advanced: 75 } as const

// Exercices quasi tous echoues : debutant, quelle que soit l'auto-evaluation. Sur 100, compare au sous-score arrondi affiche.
export const QUESTIONNAIRE_PRACTICAL_FLOOR = 20

// Part des cas qu'une reponse constante peut atteindre (verifie par le test du contenu) : seuls les cas au-dela rapportent des points.
export const QUESTIONNAIRE_CHANCE_RATIO = 0.5

export const QUESTIONNAIRE_SELF_ASSESSMENT_GAP = 0.35

// Noms SQL bruts : "testCase" a une majuscule, sans guillemets PostgreSQL chercherait testcase.
export const CONTENT_TABLES = [
  '"testCase"',
  'option',
  'question',
  'exercise_test_cases',
  'exercises',
  'lessons',
  'chapters',
  'tracks',
] as const

// Compte

export const SESSION_COOKIE = 'scalar_session'

// Renouvele a mi-vie a chaque requete authentifiee : seule une heure d'inactivite deconnecte.
export const SESSION_TTL_SECONDS = 60 * 60

export const PASSWORD_MIN_LENGTH = 8

// argon2 hache toute la chaine : sans plafond, un mot de passe geant coute cher a chaque connexion.
export const PASSWORD_MAX_LENGTH = 128

export const AUTH_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000

// Messages renvoyés au client

export const MESSAGES = {
  contentUnavailable: 'Le contenu est momentanément indisponible.',
  engineUnavailable: 'Le moteur d’exécution est momentanément indisponible.',
  tooManyExecutions: 'Trop d’exécutions : réessayez dans une minute.',
  tooManyLearners: 'Trop de créations d’apprenant : réessayez dans une minute.',
  invalidRequest: 'Requête invalide.',
  internalError: 'Erreur interne du serveur.',
  routeNotFound: 'Route introuvable.',
  trackNotFound: 'Parcours introuvable.',
  lessonNotFound: 'Cours introuvable.',
  exerciseNotFound: 'Exercice introuvable.',
  questionNotFound: 'Question introuvable.',
  learnerNotFound: 'Apprenant introuvable.',
  certificateNotFound: 'Certificat introuvable.',
  trackNotCompleted: 'Parcours pas encore terminé : tous ses exercices doivent être réussis.',
  invalidEmail: 'Adresse email invalide.',
  invalidPassword: `Le mot de passe doit contenir entre ${PASSWORD_MIN_LENGTH} et ${PASSWORD_MAX_LENGTH} caractères.`,
  emailTaken: 'Un compte existe déjà avec cette adresse email.',
  learnerAlreadyRegistered: 'Cet apprenant a déjà un compte : connectez-vous.',
  invalidCredentials: 'Email ou mot de passe incorrect.',
  unauthenticated: 'Authentification requise.',
  forbidden: 'Accès refusé.',
  tooManyAuthAttempts: 'Trop de tentatives : réessayez dans quelques minutes.',
  invalidField: 'Champ invalide ou inconnu :',
  chapterNotFound: 'Chapitre introuvable.',
  slugTaken: 'Ce slug est déjà utilisé.',
  slugLocked: 'Slug figé : ce contenu a déjà été publié, son URL ne doit plus changer.',
  prerequisiteNotFound: 'Parcours prérequis introuvable.',
  ownPrerequisite: 'Un parcours ne peut pas être son propre prérequis.',
  publishedNotDeletable: 'Déjà publié : archivez-le plutôt que de le supprimer.',
  contentInUse: 'Encore utilisé : supprimez d’abord ce qui en dépend.',
  exerciseLocked:
    'Exercice publié : repassez-le en brouillon pour modifier son code ou ses cas de test.',
  solutionNotChecked: 'Publication refusée : la solution doit d’abord réussir la vérification.',
  trackWithoutLanguage: 'Ce parcours n’a pas de langage : il ne peut pas avoir d’exercice.',
  noTestCases: 'Aucun cas de test : ajoutez-en avant de vérifier la solution.',
  solutionCheckOutdated: 'L’exercice a changé pendant la vérification : relancez-la.',
  placementOverestimatedBeginner:
    'Vous vous estimez plus avancé que ne le montrent les exercices : le parcours commence par consolider les bases.',
  placementOverestimated:
    'Vous vous estimez plus avancé que ne le montrent les exercices : le niveau proposé s’appuie d’abord sur eux.',
  placementUnderestimated:
    'Vos exercices en montrent plus que votre auto-évaluation : vous pouvez démarrer plus loin que prévu.',
  placementPrerequisite:
    'Ce parcours suppose des bases que le questionnaire n’a pas montrées : commencez par son prérequis.',
} as const

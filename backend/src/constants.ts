import type { ChapterLevel, ProgrammingLanguage } from '@scalar/shared/enums'

// Exécution

export const PISTON_LANGUAGE = 'javascript'

export const MAX_CODE_BYTES = 64 * 1024

// L'echappement JSON grossit un octet jusqu'a 6 (\u0001) : en dessous, un code valide est refuse en 413 avant d'atteindre son controle de taille.
export const MAX_BODY_BYTES = 6 * MAX_CODE_BYTES + 1024

// Doit rester egal a PISTON_RUN_TIMEOUT et PISTON_RUN_CPU_TIME (compose.yaml) : au-dela, Piston refuse toutes les executions en 400.
export const RUN_TIMEOUT_MS = 5_000

// Fenetre de EXECUTION_RATE_LIMIT : la limite se lit « par minute et par adresse IP ».
export const RATE_LIMIT_WINDOW_MS = 60_000

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

// Messages renvoyés au client

export const MESSAGES = {
  contentUnavailable: 'Le contenu est momentanément indisponible.',
  engineUnavailable: 'Le moteur d’exécution est momentanément indisponible.',
  tooManyExecutions: 'Trop d’exécutions : réessayez dans une minute.',
  invalidRequest: 'Requête invalide.',
  internalError: 'Erreur interne du serveur.',
  routeNotFound: 'Route introuvable.',
  trackNotFound: 'Parcours introuvable.',
  lessonNotFound: 'Cours introuvable.',
  exerciseNotFound: 'Exercice introuvable.',
  questionNotFound: 'Question introuvable.',
  placementOverestimatedBeginner:
    'Vous vous estimez plus avancé que ne le montrent les exercices : le parcours commence par consolider les bases.',
  placementOverestimated:
    'Vous vous estimez plus avancé que ne le montrent les exercices : le niveau proposé s’appuie d’abord sur eux.',
  placementUnderestimated:
    'Vos exercices en montrent plus que votre auto-évaluation : vous pouvez démarrer plus loin que prévu.',
  placementPrerequisite:
    'Ce parcours suppose des bases que le questionnaire n’a pas montrées : commencez par son prérequis.',
} as const

import type { ChapterLevel, ProgrammingLanguage } from '@scalar/shared/enums'

// Exécution

export const PISTON_LANGUAGE = 'javascript'

export const MAX_CODE_BYTES = 64 * 1024

// Doit rester egal a PISTON_RUN_TIMEOUT et PISTON_RUN_CPU_TIME (compose.yaml) : au-dela, Piston refuse toutes les executions en 400.
export const RUN_TIMEOUT_MS = 5_000

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

export const CONTENT_TABLES = [
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
  invalidRequest: 'Requête invalide.',
  internalError: 'Erreur interne du serveur.',
  routeNotFound: 'Route introuvable.',
  noTracks: 'Aucun parcours.',
  trackNotFound: 'Parcours introuvable.',
  lessonNotFound: 'Cours introuvable.',
  exerciseNotFound: 'Exercice introuvable.',
} as const

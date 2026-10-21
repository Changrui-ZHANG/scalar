import type { ChapterLevel, ProgrammingLanguage, PublicationStatus } from './enums.ts'

export const PROGRAMMING_LANGUAGE_LABELS: Readonly<Record<ProgrammingLanguage, string>> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
}

export const PROGRAMMING_LANGUAGE_CHOICE_LABELS: Readonly<Record<ProgrammingLanguage, string>> = {
  javascript: 'JavaScript (Node.js)',
  typescript: 'TypeScript (Node.js)',
}

export const NO_LANGUAGE_LABELS = {
  choice: 'Aucun (leçons seulement)',
  site: 'Leçons seulement',
} as const

export const CHAPTER_LEVEL_LABELS: Readonly<Record<ChapterLevel, string>> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  ecosystem: 'Écosystème',
}

export const PUBLICATION_STATUS_LABELS: Readonly<Record<PublicationStatus, string>> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
}

export const EMPTY_CHAPTER_LABEL = 'Vide'

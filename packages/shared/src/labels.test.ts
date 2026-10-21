import { describe, expect, it } from 'vitest'
import {
  CHAPTER_LEVEL_LABELS,
  EMPTY_CHAPTER_LABEL,
  NO_LANGUAGE_LABELS,
  PROGRAMMING_LANGUAGE_CHOICE_LABELS,
  PROGRAMMING_LANGUAGE_LABELS,
  PUBLICATION_STATUS_LABELS,
} from './labels.ts'

describe('labels', () => {
  it('définit les libellés de langages', () => {
    expect(PROGRAMMING_LANGUAGE_LABELS.javascript).toBe('JavaScript')
    expect(PROGRAMMING_LANGUAGE_LABELS.typescript).toBe('TypeScript')
    expect(PROGRAMMING_LANGUAGE_CHOICE_LABELS.javascript).toBe('JavaScript (Node.js)')
    expect(NO_LANGUAGE_LABELS.site).toBe('Leçons seulement')
  })

  it('définit les libellés de niveaux et statuts', () => {
    expect(CHAPTER_LEVEL_LABELS.beginner).toBe('Débutant')
    expect(PUBLICATION_STATUS_LABELS.published).toBe('Publié')
    expect(EMPTY_CHAPTER_LABEL).toBe('Vide')
  })
})

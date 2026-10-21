import { describe, expect, it } from 'vitest'
import type { TrackView } from '@scalar/shared/api'
import {
  buildSearchIndex,
  groupByTrack,
  normalizeSearchText,
  SEARCH_GROUP_LIMIT,
  SEARCH_KIND_ICONS,
  SEARCH_MIN_LENGTH,
  searchEntries,
} from './search'

const MOCK_VIEWS: readonly TrackView[] = [
  {
    track: {
      slug: 'javascript',
      name: 'JavaScript',
      summary: 'Le langage du Web.',
      programmingLanguage: 'javascript',
      prerequisite: null,
    },
    chapters: [
      {
        slug: 'variables',
        title: 'Variables et types',
        summary: 'Découvrir les variables.',
        level: 'beginner',
        number: 1,
        lessons: [
          {
            slug: 'declaration',
            title: 'Déclarer des variables',
            summary: 'Apprendre let, const et var pour stocker des valeurs.',
            headings: [
              { id: 'const-vs-let', text: 'Const ou let ?' },
              { id: 'portee', text: 'Portée de bloc' },
            ],
          },
        ],
        exercises: [
          {
            slug: 'swap-variables',
            title: 'Échanger deux variables',
            instructions: 'Écrire une fonction swap(a, b).',
          },
        ],
      },
    ],
  },
  {
    track: {
      slug: 'typescript',
      name: 'TypeScript',
      summary: 'JavaScript avec des types.',
      programmingLanguage: 'typescript',
      prerequisite: null,
    },
    chapters: [
      {
        slug: 'types-de-base',
        title: 'Types de base',
        summary: 'Notions de types.',
        level: 'beginner',
        number: 1,
        lessons: [
          {
            slug: 'typage-statique',
            title: 'Typage statique',
            summary: 'Comprendre les annotations de types.',
            headings: [],
          },
        ],
        exercises: [],
      },
    ],
  },
]

describe('normalizeSearchText', () => {
  it('retire les accents et passe en minuscules', () => {
    expect(normalizeSearchText('Déclarer une Variable')).toBe('declarer une variable')
    expect(normalizeSearchText('À É È Ç Ô Ù')).toBe('a e e c o u')
  })

  it('fusionne les espaces et retire les espaces extrêmes', () => {
    expect(normalizeSearchText('   mot1    mot2   ')).toBe('mot1 mot2')
  })
})

describe('SEARCH_KIND_ICONS', () => {
  it('définit les icônes attendues par genre', () => {
    expect(SEARCH_KIND_ICONS.track).toBe('lucide:layers')
    expect(SEARCH_KIND_ICONS.chapter).toBe('lucide:folder')
    expect(SEARCH_KIND_ICONS.lesson).toBe('lucide:book-open')
    expect(SEARCH_KIND_ICONS.heading).toBe('lucide:hash')
    expect(SEARCH_KIND_ICONS.exercise).toBe('lucide:code-xml')
  })
})

describe('buildSearchIndex', () => {
  it('indexe les parcours, chapitres, leçons, intertitres et exercices', () => {
    const index = buildSearchIndex(MOCK_VIEWS)

    // JavaScript: 1 track + 1 chapter + 1 lesson + 2 headings + 1 exercise = 6
    // TypeScript: 1 track + 1 chapter + 1 lesson + 0 headings + 0 exercise = 3
    // Total = 9
    expect(index).toHaveLength(9)

    const trackEntry = index.find((e) => e.kind === 'track' && e.trackSlug === 'javascript')
    expect(trackEntry).toBeDefined()
    expect(trackEntry?.path).toBe('/parcours/javascript')
    expect(trackEntry?.chapterNumber).toBeNull()

    const chapterEntry = index.find((e) => e.kind === 'chapter' && e.trackSlug === 'javascript')
    expect(chapterEntry?.path).toBe('/parcours/javascript#variables')
    expect(chapterEntry?.chapterNumber).toBe(1)

    const lessonEntry = index.find((e) => e.kind === 'lesson')
    expect(lessonEntry?.path).toBe('/parcours/javascript/variables/lecon/declaration')
    expect(lessonEntry?.haystack).toContain('let, const et var')

    const headingEntry = index.find((e) => e.kind === 'heading' && e.title === 'Const ou let ?')
    expect(headingEntry?.path).toBe('/parcours/javascript/variables/lecon/declaration#const-vs-let')

    const exerciseEntry = index.find((e) => e.kind === 'exercise')
    expect(exerciseEntry?.path).toBe('/parcours/javascript/variables/swap-variables')
  })
})

describe('searchEntries', () => {
  const index = buildSearchIndex(MOCK_VIEWS)

  it('renvoie un tableau vide sous SEARCH_MIN_LENGTH (2)', () => {
    expect(SEARCH_MIN_LENGTH).toBe(2)
    expect(searchEntries(index, '')).toEqual([])
    expect(searchEntries(index, 'a')).toEqual([])
  })

  it('trouve des éléments par recherche insensible à la casse et aux accents', () => {
    const results = searchEntries(index, 'declarer')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.entry.title).toBe('Déclarer des variables')
  })

  it('exige que tous les mots de la requête soient présents', () => {
    // "variables let" -> présent dans la leçon (titre "Déclarer des variables" + résumé "... let ...")
    const match = searchEntries(index, 'variables let')
    expect(match.length).toBeGreaterThan(0)

    // "variables introuvable" -> aucun résultat
    const none = searchEntries(index, 'variables introuvable')
    expect(none).toEqual([])
  })

  it('classe par score : commence par la requête (3) > contient la requête (2) > reste (1)', () => {
    // Dans index : "Variables et types" (commence par "variables" -> score 3)
    // "Déclarer des variables" (contient "variables" -> score 2)
    const results = searchEntries(index, 'variables')
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results[0]?.entry.title).toBe('Variables et types')
    expect(results[0]?.score).toBe(3)
    expect(results[1]?.entry.title).toBe('Déclarer des variables')
    expect(results[1]?.score).toBe(2)
  })

  it('trouve les intertitres de leçons', () => {
    const results = searchEntries(index, 'portee')
    expect(results).toHaveLength(1)
    expect(results[0]?.entry.kind).toBe('heading')
    expect(results[0]?.entry.path).toContain('#portee')
  })
})

describe('groupByTrack', () => {
  const index = buildSearchIndex(MOCK_VIEWS)

  it('groupe les résultats par parcours en respectant la limite', () => {
    const results = searchEntries(index, 'type') // Match "Variables et types" (JS) et "TypeScript", "Types de base", "Typage statique" (TS)
    const groups = groupByTrack(results, SEARCH_GROUP_LIMIT)

    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(group.results.length).toBeLessThanOrEqual(SEARCH_GROUP_LIMIT)
      for (const res of group.results) {
        expect(res.entry.trackSlug).toBe(group.trackSlug)
      }
    }
  })
})

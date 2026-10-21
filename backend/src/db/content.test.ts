import { describe, expect, it } from 'vitest'

import type { Content } from './seed.ts'
import { MOCK_CONTENT, validateExercises } from './seed.ts'

/**
 * Les donnees du depot doivent passer les contraintes de la migration initiale
 * et les regles de publication : sinon le seed, puis la base, les refuseront.
 */
const unique = (values: readonly unknown[]) => new Set(values).size === values.length
const c = MOCK_CONTENT
const isPublished = (row: { readonly status: string }) => row.status === 'published'

/** Positions 1, 2, 3... sans trou ni doublon, groupe par groupe. */
function contiguousBy<T extends { readonly position: number }>(
  rows: readonly T[],
  group: (row: T) => string,
): readonly string[] {
  const positions = new Map<string, number[]>()
  for (const row of rows) {
    positions.set(group(row), [...(positions.get(group(row)) ?? []), row.position])
  }
  return [...positions]
    .filter(([, list]) => list.toSorted((a, b) => a - b).some((p, i) => p !== i + 1))
    .map(([key]) => key)
}

describe('contenu du dépôt : exercices', () => {
  it('chaque solution passe ses cas, et aucun code de départ ne les passe tous', () => {
    expect(validateExercises(c)).toEqual([])
  })

  it('le contrôle attrape une solution fausse et un code de départ qui résout déjà', () => {
    const [first] = c.exercises
    expect(first).toBeDefined()
    const broken: Content = {
      ...c,
      exercises: [
        { ...first!, solutionCode: first!.starterCode, starterCode: first!.solutionCode },
      ],
    }
    const problems = validateExercises(broken)

    expect(problems.some((p) => p.includes('la solution échoue'))).toBe(true)
    expect(problems.some((p) => p.includes('résout déjà'))).toBe(true)
  })

  it('le contrôle refuse un exercice dans un parcours sans langage', () => {
    const [first] = c.exercises
    const withoutLanguage = c.tracks.find((t) => t.programmingLanguage === null)
    const chapter = c.chapters.find((ch) => ch.trackId === withoutLanguage?.id)
    expect(first && chapter).toBeTruthy()
    const misplaced: Content = { ...c, exercises: [{ ...first!, chapterId: chapter!.id }] }

    expect(validateExercises(misplaced).some((p) => p.includes('sans langage'))).toBe(true)
  })

  it('chaque exercice a au moins un cas, et au plus 3 indices', () => {
    for (const e of c.exercises) {
      expect(c.testCases.some((t) => t.exerciseId === e.id)).toBe(true)
      expect(e.hints.length <= 3).toBe(true)
    }
  })

  it('les arguments de chaque cas forment un tableau', () => {
    for (const t of c.testCases) {
      expect(Array.isArray(t.arguments)).toBe(true)
    }
  })
})

describe('contenu du dépôt : parcours', () => {
  it('un parcours sans langage de programmation n’a aucun exercice', () => {
    for (const t of c.tracks.filter((t) => t.programmingLanguage === null)) {
      const chapters = new Set(c.chapters.filter((ch) => ch.trackId === t.id).map((ch) => ch.id))
      expect(c.exercises.filter((e) => chapters.has(e.chapterId)).map((e) => e.slug)).toEqual([])
    }
  })

  it('un parcours n’est pas son propre prérequis', () => {
    for (const t of c.tracks) {
      expect(t.prerequisiteTrackId).not.toBe(t.id)
    }
  })
})

describe('contenu du dépôt : unicité et ordre, comme en base', () => {
  it('slugs uniques dans leur parent, sans préfixe de langage', () => {
    expect(unique(c.tracks.map((t) => t.slug))).toBe(true)
    expect(unique(c.chapters.map((ch) => `${ch.trackId}/${ch.slug}`))).toBe(true)
    expect(unique(c.lessons.map((l) => `${l.chapterId}/${l.slug}`))).toBe(true)
    expect(unique(c.exercises.map((e) => `${e.chapterId}/${e.slug}`))).toBe(true)
    const prefixed = [...c.exercises, ...c.lessons].filter((x) => /^(js|ts)-/.test(x.slug))
    expect(prefixed.map((x) => x.slug)).toEqual([])
  })

  it('positions 1, 2, 3... sans trou dans leur parent', () => {
    expect(contiguousBy(c.tracks, () => 'parcours')).toEqual([])
    // Les chapitres sont ordonnes dans leur niveau.
    expect(contiguousBy(c.chapters, (ch) => `${ch.trackId}/${ch.level}`)).toEqual([])
    expect(contiguousBy(c.lessons, (l) => `${l.chapterId}`)).toEqual([])
    expect(contiguousBy(c.exercises, (e) => `${e.chapterId}`)).toEqual([])
    expect(contiguousBy(c.testCases, (t) => `${t.exerciseId}`)).toEqual([])
  })
})

describe('contenu du dépôt : références', () => {
  const ids = <T extends { id: number }>(rows: readonly T[]) => new Set(rows.map((r) => r.id))

  it('toutes les clés étrangères pointent vers une ligne existante', () => {
    const tracks = ids(c.tracks)
    const chapters = ids(c.chapters)
    const exercises = ids(c.exercises)

    for (const t of c.tracks) {
      expect(t.prerequisiteTrackId === null || tracks.has(t.prerequisiteTrackId)).toBe(true)
    }
    for (const ch of c.chapters) expect(tracks.has(ch.trackId)).toBe(true)
    for (const l of c.lessons) expect(chapters.has(l.chapterId)).toBe(true)
    for (const e of c.exercises) expect(chapters.has(e.chapterId)).toBe(true)
    for (const t of c.testCases) expect(exercises.has(t.exerciseId)).toBe(true)
  })
})

describe('contenu du dépôt : règles de publication', () => {
  it('un exercice publié a réussi sa correction automatique', () => {
    for (const e of c.exercises.filter(isPublished)) {
      expect(e.solutionCheckStatus).toBe('passed')
    }
  })

  it('un chapitre publié contient au moins une leçon ou un exercice publié', () => {
    for (const ch of c.chapters.filter(isPublished)) {
      const children = [...c.lessons, ...c.exercises].filter((x) => x.chapterId === ch.id)
      expect(children.some(isPublished)).toBe(true)
    }
  })

  it('un parcours publié contient au moins un chapitre publié', () => {
    for (const t of c.tracks.filter(isPublished)) {
      const chapters = c.chapters.filter((ch) => ch.trackId === t.id)
      expect(chapters.some(isPublished)).toBe(true)
    }
  })

  it('date de première publication si et seulement si publié', () => {
    for (const row of [...c.tracks, ...c.chapters, ...c.lessons, ...c.exercises]) {
      expect(row.firstPublishedAt !== null).toBe(isPublished(row))
    }
  })

  it('les leçons d’écosystème ont une date de relecture', () => {
    const ecosystem = new Set(
      c.chapters.filter((ch) => ch.level === 'ecosystem').map((ch) => ch.id),
    )
    for (const l of c.lessons.filter((l) => ecosystem.has(l.chapterId))) {
      expect(l.lastReviewedAt instanceof Date).toBe(true)
    }
  })
})

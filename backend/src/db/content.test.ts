import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

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
    assert.deepEqual(validateExercises(c), [])
  })

  it('le contrôle attrape une solution fausse et un code de départ qui résout déjà', () => {
    const [first] = c.exercises
    assert.ok(first)
    const broken: Content = {
      ...c,
      exercises: [{ ...first, solutionCode: first.starterCode, starterCode: first.solutionCode }],
    }
    const problems = validateExercises(broken)

    assert.ok(problems.some((p) => p.includes('la solution échoue')))
    assert.ok(problems.some((p) => p.includes('résout déjà')))
  })

  it('le contrôle refuse un exercice dans un parcours sans langage', () => {
    const [first] = c.exercises
    const withoutLanguage = c.tracks.find((t) => t.programmingLanguage === null)
    const chapter = c.chapters.find((ch) => ch.trackId === withoutLanguage?.id)
    assert.ok(first && chapter)
    const misplaced: Content = { ...c, exercises: [{ ...first, chapterId: chapter.id }] }

    assert.ok(validateExercises(misplaced).some((p) => p.includes('sans langage')))
  })

  it('chaque exercice a au moins un cas, et au plus 3 indices', () => {
    for (const e of c.exercises) {
      assert.ok(c.testCases.some((t) => t.exerciseId === e.id), `${e.slug} : aucun cas`)
      assert.ok(e.hints.length <= 3, `${e.slug} : trop d’indices`)
    }
  })

  it('les arguments de chaque cas forment un tableau', () => {
    for (const t of c.testCases) {
      assert.ok(Array.isArray(t.arguments), `cas ${t.id}`)
    }
  })
})

describe('contenu du dépôt : parcours', () => {
  it('un parcours sans langage de programmation n’a aucun exercice', () => {
    for (const t of c.tracks.filter((t) => t.programmingLanguage === null)) {
      const chapters = new Set(c.chapters.filter((ch) => ch.trackId === t.id).map((ch) => ch.id))
      assert.deepEqual(
        c.exercises.filter((e) => chapters.has(e.chapterId)).map((e) => e.slug),
        [],
        t.slug,
      )
    }
  })

  it('un parcours n’est pas son propre prérequis', () => {
    for (const t of c.tracks) {
      assert.notEqual(t.prerequisiteTrackId, t.id, t.slug)
    }
  })
})

describe('contenu du dépôt : unicité et ordre, comme en base', () => {
  it('slugs uniques dans leur parent, sans préfixe de langage', () => {
    assert.ok(unique(c.tracks.map((t) => t.slug)))
    assert.ok(unique(c.chapters.map((ch) => `${ch.trackId}/${ch.slug}`)))
    assert.ok(unique(c.lessons.map((l) => `${l.chapterId}/${l.slug}`)))
    assert.ok(unique(c.exercises.map((e) => `${e.chapterId}/${e.slug}`)))
    const prefixed = [...c.exercises, ...c.lessons].filter((x) => /^(js|ts)-/.test(x.slug))
    assert.deepEqual(
      prefixed.map((x) => x.slug),
      [],
    )
  })

  it('positions 1, 2, 3... sans trou dans leur parent', () => {
    assert.deepEqual(
      contiguousBy(c.tracks, () => 'parcours'),
      [],
    )
    // Les chapitres sont ordonnes dans leur niveau.
    assert.deepEqual(
      contiguousBy(c.chapters, (ch) => `${ch.trackId}/${ch.level}`),
      [],
    )
    assert.deepEqual(
      contiguousBy(c.lessons, (l) => `${l.chapterId}`),
      [],
    )
    assert.deepEqual(
      contiguousBy(c.exercises, (e) => `${e.chapterId}`),
      [],
    )
    assert.deepEqual(
      contiguousBy(c.testCases, (t) => `${t.exerciseId}`),
      [],
    )
  })
})

describe('contenu du dépôt : références', () => {
  const ids = <T extends { id: number }>(rows: readonly T[]) => new Set(rows.map((r) => r.id))

  it('toutes les clés étrangères pointent vers une ligne existante', () => {
    const tracks = ids(c.tracks)
    const chapters = ids(c.chapters)
    const exercises = ids(c.exercises)

    for (const t of c.tracks) {
      assert.ok(t.prerequisiteTrackId === null || tracks.has(t.prerequisiteTrackId), t.slug)
    }
    for (const ch of c.chapters) assert.ok(tracks.has(ch.trackId), ch.slug)
    for (const l of c.lessons) assert.ok(chapters.has(l.chapterId), l.slug)
    for (const e of c.exercises) assert.ok(chapters.has(e.chapterId), e.slug)
    for (const t of c.testCases) assert.ok(exercises.has(t.exerciseId), `cas ${t.id}`)
  })
})

describe('contenu du dépôt : règles de publication', () => {
  it('un exercice publié a réussi sa correction automatique', () => {
    for (const e of c.exercises.filter(isPublished)) {
      assert.equal(e.solutionCheckStatus, 'passed', e.slug)
    }
  })

  it('un chapitre publié contient au moins une leçon ou un exercice publié', () => {
    for (const ch of c.chapters.filter(isPublished)) {
      const children = [...c.lessons, ...c.exercises].filter((x) => x.chapterId === ch.id)
      assert.ok(children.some(isPublished), `« ${ch.slug} » est vide`)
    }
  })

  it('un parcours publié contient au moins un chapitre publié', () => {
    for (const t of c.tracks.filter(isPublished)) {
      const chapters = c.chapters.filter((ch) => ch.trackId === t.id)
      assert.ok(chapters.some(isPublished), t.slug)
    }
  })

  it('date de première publication si et seulement si publié', () => {
    for (const row of [...c.tracks, ...c.chapters, ...c.lessons, ...c.exercises]) {
      assert.equal(row.firstPublishedAt !== null, isPublished(row), row.slug)
    }
  })

  it('les leçons d’écosystème ont une date de relecture', () => {
    const ecosystem = new Set(c.chapters.filter((ch) => ch.level === 'ecosystem').map((ch) => ch.id))
    for (const l of c.lessons.filter((l) => ecosystem.has(l.chapterId))) {
      assert.ok(l.lastReviewedAt instanceof Date, l.slug)
    }
  })
})

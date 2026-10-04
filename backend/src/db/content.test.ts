import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Content } from './seed.ts'
import { MOCK_CONTENT, validateExercises } from './seed.ts'

/**
 * Les donnees du depot doivent passer les contraintes de `0_init/migration.sql` :
 * sinon le seed, puis la base, les refuseront.
 */
const unique = (values: readonly unknown[]) => new Set(values).size === values.length
const c = MOCK_CONTENT

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

  it('chaque exercice a au moins un cas, et au plus 3 indices', () => {
    for (const e of c.exercises) {
      assert.ok(c.testCases.some((t) => t.exerciseId === e.id), `${e.slug} : aucun cas`)
      assert.ok(e.hints.length <= 3, `${e.slug} : trop d’indices`)
    }
  })

  it('les arguments de chaque cas forment un tableau', () => {
    for (const t of c.testCases) {
      assert.ok(Array.isArray(t.args), `cas ${t.id}`)
    }
  })
})

describe('contenu du dépôt : unicité, comme en base', () => {
  it('slugs uniques dans leur parent, sans préfixe de langage', () => {
    assert.ok(unique(c.languages.map((l) => l.slug)))
    assert.ok(unique(c.chapters.map((ch) => `${ch.languageId}/${ch.slug}`)))
    assert.ok(unique(c.exercises.map((e) => `${e.chapterId}/${e.slug}`)))
    assert.ok(unique(c.lessons.map((l) => `${l.languageId}/${l.slug}`)))
    const prefixed = [...c.exercises, ...c.lessons].filter((x) => /^(js|ts)-/.test(x.slug))
    assert.deepEqual(prefixed.map((x) => x.slug), [])
  })

  it('positions uniques dans leur parent', () => {
    assert.ok(unique(c.languages.map((l) => l.position)))
    assert.ok(unique(c.categories.map((cat) => cat.position)))
    assert.ok(unique(c.chapters.map((ch) => `${ch.languageId}/${ch.position}`)))
    assert.ok(unique(c.exercises.map((e) => `${e.chapterId}/${e.position}`)))
    assert.ok(unique(c.testCases.map((t) => `${t.exerciseId}/${t.position}`)))
    // NULLS NOT DISTINCT : deux lecons transverses ne partagent pas une position.
    assert.ok(unique(c.lessons.map((l) => `${l.languageId}/${l.categoryId}/${l.position}`)))
  })
})

describe('contenu du dépôt : références', () => {
  const ids = <T extends { id: number }>(rows: readonly T[]) => new Set(rows.map((r) => r.id))

  it('toutes les clés étrangères pointent vers une ligne existante', () => {
    const languages = ids(c.languages)
    const chapters = ids(c.chapters)
    const exercises = ids(c.exercises)
    const lessons = ids(c.lessons)
    const categories = ids(c.categories)

    for (const l of c.languages) {
      assert.ok(l.prerequisiteLanguageId === null || languages.has(l.prerequisiteLanguageId))
    }
    for (const ch of c.chapters) assert.ok(languages.has(ch.languageId), ch.slug)
    for (const e of c.exercises) assert.ok(chapters.has(e.chapterId), e.slug)
    for (const t of c.testCases) assert.ok(exercises.has(t.exerciseId), `cas ${t.id}`)
    for (const l of c.lessons) {
      assert.ok(categories.has(l.categoryId), l.slug)
      assert.ok(l.languageId === null || languages.has(l.languageId), l.slug)
    }
    for (const link of c.lessonChapters) {
      assert.ok(lessons.has(link.lessonId) && chapters.has(link.chapterId))
    }
    assert.ok(unique(c.lessonChapters.map((l) => `${l.lessonId}/${l.chapterId}`)))
  })

  it('une leçon recopie fidèlement la portée de sa catégorie, et n’a un langage que si elle le doit', () => {
    for (const l of c.lessons) {
      const category = c.categories.find((cat) => cat.id === l.categoryId)
      assert.equal(l.categoryScope, category?.scope, l.slug)
      assert.equal(l.categoryScope === 'all_languages', l.languageId === null, l.slug)
    }
  })

  it('chaque chapitre publié est lié à au moins une leçon publiée', () => {
    const published = new Set(c.lessons.filter((l) => l.status === 'published').map((l) => l.id))
    for (const ch of c.chapters) {
      assert.ok(
        c.lessonChapters.some((link) => link.chapterId === ch.id && published.has(link.lessonId)),
        `aucune leçon pour « ${ch.slug} »`,
      )
    }
  })

  it('les fiches d’écosystème ont une date de relecture', () => {
    const ecosystem = c.categories.find((cat) => cat.slug === 'ecosysteme')
    for (const l of c.lessons.filter((l) => l.categoryId === ecosystem?.id)) {
      assert.ok(l.reviewedAt instanceof Date, l.slug)
    }
  })
})

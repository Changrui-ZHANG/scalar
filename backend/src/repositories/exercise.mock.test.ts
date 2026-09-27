import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'

import type { TestCase } from '../db/schema.ts'
import { MOCK_CHAPTERS, MOCK_EXERCISES } from './exercise.mock.ts'

/**
 * Les donnees fictives doivent respecter ce que la base imposera, sinon le
 * passage a Prisma revelera des exercices invalides.
 */
describe('données fictives du parcours', () => {
  it('respectent les contraintes d’unicité de la base', () => {
    const unique = (values: readonly unknown[]) => new Set(values).size === values.length

    assert.ok(unique(MOCK_CHAPTERS.map((c) => c.slug)), 'slug de chapitre en double')
    assert.ok(unique(MOCK_CHAPTERS.map((c) => `${c.language}/${c.position}`)))
    assert.ok(unique(MOCK_EXERCISES.map((e) => e.slug)), 'slug d’exercice en double')
    assert.ok(unique(MOCK_EXERCISES.map((e) => `${e.chapterId}/${e.position}`)))
  })

  it('rattachent chaque exercice à un chapitre existant', () => {
    const ids = new Set(MOCK_CHAPTERS.map((c) => c.id))
    for (const e of MOCK_EXERCISES) {
      assert.ok(ids.has(e.chapterId), `${e.slug} : chapitre ${e.chapterId} absent`)
    }
  })

  it('ont de 0 à 3 indices et au moins un cas de test', () => {
    for (const e of MOCK_EXERCISES) {
      assert.ok(e.hints.length <= 3, `${e.slug} : trop d’indices`)
      assert.ok(Array.isArray(e.tests) && e.tests.length >= 1, `${e.slug} : aucun test`)
    }
  })

  // Contenu redige par l'equipe, donc de confiance : `vm` suffit ici. Le code
  // des apprenants, lui, ne passe que par Piston.
  for (const e of MOCK_EXERCISES) {
    const load = (code: string) =>
      runInNewContext(`${code}\n${e.functionName}`) as (...args: unknown[]) => unknown
    const tests = e.tests as unknown as TestCase[]

    it(`la solution de « ${e.slug} » passe ses propres tests`, () => {
      const fn = load(e.solution)
      for (const { args, expected } of tests) {
        // Passage par JSON : les resultats d'un autre contexte `vm` n'ont pas
        // les memes prototypes, et c'est de toute facon ce que verra le client.
        assert.deepEqual(JSON.parse(JSON.stringify(fn(...args))), expected)
      }
    })

    it(`le code de départ de « ${e.slug} » ne résout pas l’exercice`, () => {
      const fn = load(e.starterCode)
      const allPass = tests.every(
        ({ args, expected }) => JSON.stringify(fn(...args) ?? null) === JSON.stringify(expected),
      )
      assert.equal(allPass, false)
    })
  }
})

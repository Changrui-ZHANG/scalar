import { describe, expect, it } from 'vitest'

import { append, replace, slugify } from '../app/utils/content'
import { exerciseInputSchema, toExerciseData, toExerciseInput } from '../app/utils/schemas'

describe('slugify', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(slugify('  Les Énumérations : déjà vues ! ')).toBe('les-enumerations-deja-vues')
  })
})

describe('append', () => {
  const siblings = [{ slug: 'boucles', position: 3 }]

  it('ajoute en derniere position', () => {
    expect(append(siblings, { slug: 'tableaux' }, 8)).toEqual({
      ok: true,
      item: { slug: 'tableaux', id: 8, position: 4 },
    })
  })

  it('commence a 1 sans voisin', () => {
    const result = append([], { slug: 'tableaux' }, 1)
    expect(result.ok && result.item.position).toBe(1)
  })

  it('refuse un slug deja pris', () => {
    expect(append(siblings, { slug: 'boucles' }, 8)).toMatchObject({ ok: false, field: 'slug' })
  })
})

describe('replace', () => {
  const boucles = { id: 1, slug: 'boucles', position: 1, title: 'Boucles' }
  const tableaux = { id: 2, slug: 'tableaux', position: 2, title: 'Tableaux' }

  it('garde id et position, et accepte son propre slug', () => {
    expect(replace([boucles, tableaux], tableaux, { slug: 'tableaux', title: 'Listes' })).toEqual({
      ok: true,
      item: { id: 2, slug: 'tableaux', position: 2, title: 'Listes' },
    })
  })

  it('refuse le slug d un autre element', () => {
    expect(replace([boucles, tableaux], tableaux, { slug: 'boucles' })).toMatchObject({
      ok: false,
      field: 'slug',
    })
  })
})

describe('exercice', () => {
  const testCase = { args: '[2, 3]', expected: '5', label: '', isHidden: false }
  const input = {
    title: 'Somme',
    slug: 'somme',
    statement: 'Additionnez a et b.',
    functionName: 'somme',
    starterCode: 'function somme(a, b) {}',
    solutionCode: 'function somme(a, b) { return a + b }',
    hints: '  Utilisez +  \n\n Pensez au return ',
    testCases: [testCase],
    status: 'draft' as const,
  }

  it('accepte un exercice complet et relit indices et cas de test', () => {
    const parsed = exerciseInputSchema.parse(input)
    expect(toExerciseData(parsed)).toMatchObject({
      hints: ['Utilisez +', 'Pensez au return'],
      testCases: [{ args: [2, 3], expected: 5 }],
    })
  })

  it('refuse des arguments qui ne sont pas un tableau JSON', () => {
    const bad = { ...input, testCases: [{ ...testCase, args: '2, 3' }] }
    expect(exerciseInputSchema.safeParse(bad).success).toBe(false)
  })

  it('exige au moins un cas de test', () => {
    expect(exerciseInputSchema.safeParse({ ...input, testCases: [] }).success).toBe(false)
  })

  it('se relit a l identique dans le formulaire d edition', () => {
    const stored = {
      ...toExerciseData(exerciseInputSchema.parse(input)),
      id: 1,
      chapterId: 1,
      position: 1,
    }
    const back = toExerciseInput(stored)
    expect(back.hints).toBe('Utilisez +\nPensez au return')
    expect(back.testCases).toEqual([{ args: '[2,3]', expected: '5', label: '', isHidden: false }])
    expect(toExerciseData(exerciseInputSchema.parse(back)).testCases).toEqual(stored.testCases)
  })
})

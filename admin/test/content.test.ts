import { describe, expect, it } from 'vitest'

import { safeRedirect, toApiFailure, toSaveResult } from '../app/utils/api'
import { slugify } from '../app/utils/content'
import {
  chapterInputSchema,
  exerciseInputSchema,
  toExerciseData,
  toExerciseInput,
  trackInputSchema,
} from '../app/utils/schemas'

describe('slugify', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(slugify('  Les Énumérations : déjà vues ! ')).toBe('les-enumerations-deja-vues')
  })
})

describe('toApiFailure', () => {
  it('garde le statut et le message de l’API', () => {
    expect(toApiFailure({ status: 409, data: { error: 'Ce slug est déjà utilisé.' } })).toEqual({
      ok: false,
      status: 409,
      message: 'Ce slug est déjà utilisé.',
    })
  })

  it('donne un message lisible quand le serveur ne répond pas', () => {
    expect(toApiFailure(new Error('fetch failed'))).toMatchObject({ status: null })
    expect(toApiFailure(new Error('fetch failed')).message).toContain('ne répond pas')
  })

  it('ignore une page d’erreur qui n’est pas du JSON de l’API', () => {
    expect(toApiFailure({ status: 502, data: '<html>' })).toMatchObject({
      status: 502,
      message: expect.stringContaining('ne répond pas'),
    })
  })
})

describe('toSaveResult', () => {
  const failure = (message: string) => ({ ok: false, status: 409, message }) as const

  it('renvoie l’élément enregistré', () => {
    expect(toSaveResult({ ok: true, data: 1 })).toEqual({ ok: true, item: 1 })
  })

  it.each(['Ce slug est déjà utilisé.', 'Slug figé : ce contenu a déjà été publié.'])(
    'vise le champ slug pour « %s »',
    (message) => {
      expect(toSaveResult(failure(message))).toEqual({ ok: false, field: 'slug', message })
    },
  )

  it('ne vise aucun champ pour une autre erreur', () => {
    expect(toSaveResult(failure('Accès refusé.'))).toMatchObject({ ok: false, field: null })
  })
})

describe('safeRedirect', () => {
  it('suit un chemin de l’application', () => {
    expect(safeRedirect('/parcours/2/modifier?x=1')).toBe('/parcours/2/modifier?x=1')
  })

  it.each([
    ['une adresse externe', 'https://evil.example'],
    ['une adresse sans protocole', '//evil.example'],
    ['une adresse avec antislash', '/\\evil.example'],
    ['une valeur absente', undefined],
    ['une valeur répétée', ['/a', '/b']],
  ])('ramène à la liste pour %s', (_name, target) => {
    expect(safeRedirect(target)).toBe('/parcours')
  })
})

describe('formulaires de contenu', () => {
  const track = {
    name: 'Conception',
    slug: 'conception',
    summary: 'Des principes.',
    programmingLanguage: null,
    status: 'draft',
  }
  const chapter = {
    title: 'Tableaux',
    slug: 'tableaux',
    level: 'beginner',
    summary: 'Des tableaux.',
    status: 'draft',
  }

  it('accepte un parcours sans langage', () => {
    expect(trackInputSchema.safeParse(track).success).toBe(true)
  })

  it('refuse un langage inconnu', () => {
    expect(trackInputSchema.safeParse({ ...track, programmingLanguage: 'cobol' }).success).toBe(
      false,
    )
  })

  it('exige un niveau de chapitre connu', () => {
    expect(chapterInputSchema.safeParse(chapter).success).toBe(true)
    expect(chapterInputSchema.safeParse({ ...chapter, level: 'expert' }).success).toBe(false)
  })

  it('refuse les longueurs que l’API refuserait', () => {
    expect(chapterInputSchema.safeParse({ ...chapter, title: 'x'.repeat(101) }).success).toBe(false)
    expect(chapterInputSchema.safeParse({ ...chapter, slug: 'x'.repeat(65) }).success).toBe(false)
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

  it('produit le corps attendu par l’API', () => {
    const data = toExerciseData(exerciseInputSchema.parse(input))

    expect(data).toMatchObject({
      instructions: 'Additionnez a et b.',
      hints: ['Utilisez +', 'Pensez au return'],
      testCases: [{ arguments: [2, 3], expectedResult: 5, description: null }],
    })
    expect(data).not.toHaveProperty('statement')
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
    expect(back.statement).toBe('Additionnez a et b.')
    expect(back.hints).toBe('Utilisez +\nPensez au return')
    expect(back.testCases).toEqual([{ args: '[2,3]', expected: '5', label: '', isHidden: false }])
    expect(toExerciseData(exerciseInputSchema.parse(back)).testCases).toEqual(stored.testCases)
  })
})

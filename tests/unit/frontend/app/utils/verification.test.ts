import { describe, expect, it } from 'vitest'
import type { PublicTestCase, VerificationResult } from '@scalar/shared/api'
import {
  caseCount,
  failedGeneralCheck,
  formatCall,
  formatJson,
  splitChecks,
} from '../../../../../frontend/app/utils/verification'

const testCases: readonly PublicTestCase[] = [
  { arguments: [1, 2], expectedResult: [2, 1], description: 'Deux entiers' },
  { arguments: ['a', 'b'], expectedResult: ['b', 'a'], description: null },
]

const execution: VerificationResult['execution'] = {
  status: 'OK',
  label: 'Terminé',
  run: { stdout: '', stderr: '', output: '', code: 0, signal: null, wall_time: 12 },
}

// 3 visibles et cachés : le 2e cas visible et le cas caché échouent.
const failing: VerificationResult = {
  passed: false,
  passedCount: 3,
  total: 5,
  checks: [
    { label: "Le programme s'exécute", passed: true, detail: null, caseIndex: null, actual: null },
    {
      label: 'La fonction swap est définie',
      passed: true,
      detail: null,
      caseIndex: null,
      actual: null,
    },
    { label: 'swap(1, 2)', passed: true, detail: null, caseIndex: 0, actual: [2, 1] },
    { label: 'swap("a", "b")', passed: false, detail: null, caseIndex: 1, actual: ['a', 'b'] },
    {
      label: 'Cas supplémentaire 1',
      passed: false,
      detail: 'Résultat incorrect sur un cas non affiché.',
      caseIndex: null,
      actual: null,
    },
  ],
  execution,
}

describe('utils/verification', () => {
  it('écrit les valeurs comme la maquette, avec un espace après les virgules', () => {
    expect(formatJson([2, 1])).toBe('[2, 1]')
    expect(formatJson(['b', 'a'])).toBe('["b", "a"]')
    expect(formatJson([0, null])).toBe('[0, null]')
    expect(formatJson({ x: 1 })).toBe('{ "x": 1 }')
    expect(formatJson(true)).toBe('true')
  })

  it('écrit l’appel d’un cas de test', () => {
    expect(formatCall('swap', [1, 2])).toBe('swap(1, 2)')
    expect(formatCall('swap', ['a', 'b'])).toBe('swap("a", "b")')
  })

  it('compte les cas seulement, sans les deux vérifications générales', () => {
    expect(caseCount(failing)).toEqual({ passed: 1, total: 3 })
  })

  it('rattache chaque cas visible à son résultat et compte les cachés en échec', () => {
    const split = splitChecks(failing, testCases)

    expect(split.general).toHaveLength(2)
    expect(split.visible).toHaveLength(2)
    expect(split.visible[1]?.testCase.arguments).toEqual(['a', 'b'])
    expect(split.visible[1]?.check.passed).toBe(false)
    expect(split.hiddenFailed).toBe(1)
  })

  it('trouve la première vérification générale en échec', () => {
    expect(failedGeneralCheck(failing)).toBeNull()

    const broken: VerificationResult = {
      ...failing,
      checks: [
        {
          label: "Le programme s'exécute",
          passed: false,
          detail: 'SyntaxError',
          caseIndex: null,
          actual: null,
        },
        {
          label: 'La fonction swap est définie',
          passed: false,
          detail: null,
          caseIndex: null,
          actual: null,
        },
      ],
    }
    expect(failedGeneralCheck(broken)?.detail).toBe('SyntaxError')
  })
})

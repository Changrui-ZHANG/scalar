import { describe, expect, it } from 'vitest'
import type { PublicTestCase, VerificationResult } from '@scalar/shared/api'
import { formatCall, splitChecks } from './verification'

describe('utils/verification', () => {
  const sampleTestCases: readonly PublicTestCase[] = [
    { arguments: [1, 2], expectedResult: [2, 1], description: 'Deux entiers' },
    { arguments: ['a', 'b'], expectedResult: ['b', 'a'], description: null },
  ]

  it('formate correctement les appels de fonction', () => {
    expect(formatCall('swap', [1, 2])).toBe('swap(1, 2)')
    expect(formatCall('isEven', [4])).toBe('isEven(4)')
  })

  it('génère un résultat non joué quand verification est nul', () => {
    const res = splitChecks(null, sampleTestCases, 'swap', 1)
    expect(res.hasRun).toBe(false)
    expect(res.totalCaseCount).toBe(3)
    expect(res.passedCaseCount).toBe(0)
    expect(res.testCaseChecks).toHaveLength(2)
    expect(res.testCaseChecks[0]?.callDisplay).toBe('swap(1, 2)')
    expect(res.testCaseChecks[0]?.expectedDisplay).toBe('[2,1]')
  })

  it('découpe les vérifications générales et les cas de tests', () => {
    const mockVerification: VerificationResult = {
      passed: false,
      passedCount: 3,
      total: 5,
      checks: [
        { label: "Le programme s'exécute", passed: true, detail: null, caseIndex: null, actual: null },
        { label: 'La fonction swap est définie', passed: true, detail: null, caseIndex: null, actual: null },
        { label: 'swap(1, 2)', passed: true, detail: null, caseIndex: 0, actual: [2, 1] },
        { label: "swap('a', 'b')", passed: false, detail: null, caseIndex: 1, actual: ['a', 'b'] },
        { label: 'Cas supplémentaire 1', passed: true, detail: null, caseIndex: null, actual: null },
      ],
      execution: {
        status: 'OK',
        label: 'OK',
        run: { stdout: '', stderr: '', output: '', code: 0, signal: null, wall_time: 12 },
      },
    }

    const res = splitChecks(mockVerification, sampleTestCases, 'swap')
    expect(res.hasRun).toBe(true)
    expect(res.passed).toBe(false)
    expect(res.generalFailed).toBe(false)
    expect(res.generalChecks).toHaveLength(2)
    expect(res.testCaseChecks).toHaveLength(3)
    expect(res.passedCaseCount).toBe(2)
    expect(res.totalCaseCount).toBe(3)
    expect(res.testCaseChecks[1]?.passed).toBe(false)
    expect(res.testCaseChecks[1]?.actualDisplay).toBe('["a","b"]')
  })

  it('détecte quand une vérification générale échoue', () => {
    const mockVerification: VerificationResult = {
      passed: false,
      passedCount: 0,
      total: 4,
      checks: [
        { label: "Le programme s'exécute", passed: false, detail: 'SyntaxError: Unexpected token', caseIndex: null, actual: null },
        { label: 'La fonction swap est définie', passed: false, detail: null, caseIndex: null, actual: null },
      ],
      execution: {
        status: 'RE',
        label: 'Erreur',
        run: { stdout: '', stderr: 'SyntaxError: Unexpected token', output: '', code: 1, signal: null, wall_time: 5 },
      },
    }

    const res = splitChecks(mockVerification, sampleTestCases, 'swap')
    expect(res.generalFailed).toBe(true)
    expect(res.firstGeneralFailure?.detail).toBe('SyntaxError: Unexpected token')
  })
})

import type { PublicTestCase, VerificationCheck, VerificationResult } from '@scalar/shared/api'

export interface GeneralCheck {
  readonly label: string
  readonly passed: boolean
  readonly detail: string | null
}

export interface SplitTestCaseCheck {
  readonly index: number // index dans testCases (0..N-1) ou pour cas cachés
  readonly label: string
  readonly passed: boolean
  readonly isHidden: boolean
  readonly callDisplay: string
  readonly expectedDisplay: string
  readonly actualDisplay: string | null
  readonly detail: string | null
}

export interface SplitChecksResult {
  readonly hasRun: boolean
  readonly passed: boolean
  readonly generalChecks: readonly GeneralCheck[]
  readonly generalFailed: boolean
  readonly firstGeneralFailure: GeneralCheck | null
  readonly testCaseChecks: readonly SplitTestCaseCheck[]
  readonly passedCaseCount: number
  readonly totalCaseCount: number
}

function formatJson(val: unknown): string {
  if (val === undefined) return 'undefined'
  try {
    return JSON.stringify(val)
  } catch {
    return String(val)
  }
}

export function formatCall(functionName: string, args: readonly unknown[]): string {
  const formattedArgs = args.map((a) => formatJson(a)).join(', ')
  return `${functionName}(${formattedArgs})`
}

export function splitChecks(
  verification: VerificationResult | null,
  testCases: readonly PublicTestCase[],
  functionName: string = 'solution',
  hiddenCount: number = 0,
): SplitChecksResult {
  if (!verification) {
    // Non joué : cas de test visibles initiaux
    const initialTestCases: SplitTestCaseCheck[] = testCases.map((tc, idx) => ({
      index: idx,
      label: tc.description ?? formatCall(functionName, tc.arguments),
      passed: false,
      isHidden: false,
      callDisplay: formatCall(functionName, tc.arguments),
      expectedDisplay: formatJson(tc.expectedResult),
      actualDisplay: null,
      detail: null,
    }))

    return {
      hasRun: false,
      passed: false,
      generalChecks: [],
      generalFailed: false,
      firstGeneralFailure: null,
      testCaseChecks: initialTestCases,
      passedCaseCount: 0,
      totalCaseCount: testCases.length + hiddenCount,
    }
  }

  const checks = verification.checks ?? []
  const g1 = checks[0] ?? { label: "Le programme s'exécute", passed: true, detail: null }
  const g2 = checks[1] ?? { label: `La fonction ${functionName} est définie`, passed: true, detail: null }

  const generalChecks: GeneralCheck[] = [
    { label: g1.label, passed: g1.passed, detail: g1.detail },
    { label: g2.label, passed: g2.passed, detail: g2.detail },
  ]

  const firstGeneralFailure = generalChecks.find((c) => !c.passed) ?? null
  const generalFailed = firstGeneralFailure !== null

  const caseChecksRaw: VerificationCheck[] = checks.slice(2)
  let passedCount = 0

  const testCaseChecks: SplitTestCaseCheck[] = caseChecksRaw.map((check, idx) => {
    if (check.passed) {
      passedCount++
    }
    const isVisible = check.caseIndex !== null && check.caseIndex !== undefined && check.caseIndex < testCases.length
    const originalTestCase = isVisible ? testCases[check.caseIndex!] : null

    const callDisplay = originalTestCase ? formatCall(functionName, originalTestCase.arguments) : check.label
    const expectedDisplay = originalTestCase ? formatJson(originalTestCase.expectedResult) : ''
    const actualDisplay = check.actual !== null && check.actual !== undefined ? formatJson(check.actual) : null

    return {
      index: isVisible ? check.caseIndex! : idx,
      label: originalTestCase?.description ?? check.label,
      passed: check.passed,
      isHidden: !isVisible,
      callDisplay,
      expectedDisplay,
      actualDisplay,
      detail: check.detail,
    }
  })

  return {
    hasRun: true,
    passed: verification.passed,
    generalChecks,
    generalFailed,
    firstGeneralFailure,
    testCaseChecks,
    passedCaseCount: passedCount,
    totalCaseCount: caseChecksRaw.length,
  }
}

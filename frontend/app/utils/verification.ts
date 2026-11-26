// Lecture de la réponse de « Vérifier » (specs-site.md § 7.2).
//
// La réponse `checks` est toujours dans cet ordre :
//   checks[0] : « Le programme s'exécute »
//   checks[1] : « La fonction X est définie »
//   checks[2…] : un élément par cas de test (visibles et cachés), dans l'ordre des cas.
// Un cas visible porte `caseIndex` (sa place dans testCases) ; un cas caché a caseIndex nul.
import type {
  JsonValue,
  PublicTestCase,
  VerificationCheck,
  VerificationResult,
} from '@scalar/shared/api'

// Écrit une valeur comme dans la maquette : « [2, 1] », « ["b", "a"] », « { "x": 1 } ».
export function formatJson(value: JsonValue): string {
  if (Array.isArray(value)) {
    const items: string[] = []
    for (const item of value) {
      items.push(formatJson(item))
    }
    return `[${items.join(', ')}]`
  }

  if (value !== null && typeof value === 'object') {
    const entries: string[] = []
    for (const [key, item] of Object.entries(value)) {
      entries.push(`${JSON.stringify(key)}: ${formatJson(item)}`)
    }
    return `{ ${entries.join(', ')} }`
  }

  return JSON.stringify(value)
}

// Écrit l'appel d'un cas de test : « swap(1, 2) ».
export function formatCall(functionName: string, args: readonly JsonValue[]): string {
  const parts: string[] = []
  for (const arg of args) {
    parts.push(formatJson(arg))
  }
  return `${functionName}(${parts.join(', ')})`
}

// Les deux vérifications générales, les cas visibles avec leur résultat, et le nombre
// de cas cachés en échec.
export function splitChecks(
  result: VerificationResult,
  testCases: readonly PublicTestCase[],
): {
  readonly general: readonly VerificationCheck[]
  readonly visible: readonly {
    readonly testCase: PublicTestCase
    readonly check: VerificationCheck
  }[]
  readonly hiddenFailed: number
} {
  const general = result.checks.slice(0, 2)
  const visible: { testCase: PublicTestCase; check: VerificationCheck }[] = []
  let hiddenFailed = 0

  for (const check of result.checks.slice(2)) {
    const index = check.caseIndex
    const testCase = index === null ? undefined : testCases[index]

    if (testCase) {
      visible.push({ testCase, check })
    } else if (!check.passed) {
      hiddenFailed += 1
    }
  }

  return { general, visible, hiddenFailed }
}

// Première vérification générale en échec (programme qui ne s'exécute pas, fonction absente).
export function failedGeneralCheck(result: VerificationResult): VerificationCheck | null {
  for (const check of result.checks.slice(0, 2)) {
    if (!check.passed) {
      return check
    }
  }
  return null
}

// Compteur affiché « n cas sur m réussis » : les cas seulement, jamais passedCount / total
// de l'API, qui comptent aussi les deux vérifications générales.
export function caseCount(result: VerificationResult): {
  readonly passed: number
  readonly total: number
} {
  let passed = 0
  let total = 0
  for (const check of result.checks.slice(2)) {
    total += 1
    if (check.passed) {
      passed += 1
    }
  }
  return { passed, total }
}

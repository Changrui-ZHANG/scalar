// Les valeurs attendues ne quittent jamais le serveur : la comparaison se fait ici, pas dans le moteur.
import { isDeepStrictEqual } from 'node:util'

import { FUNCTION_NAME_PATTERN } from '../constants.ts'
import type { ExecutionResult } from './execution.service.ts'

export interface VerificationCase {
  readonly arguments: readonly unknown[]
  readonly expectedResult: unknown
  readonly description: string | null
  readonly isHidden: boolean
}

export interface VerificationCheck {
  readonly label: string
  readonly passed: boolean
  readonly detail: string | null
}

export interface VerificationResult {
  readonly passed: boolean
  readonly passedCount: number
  readonly total: number
  readonly checks: readonly VerificationCheck[]
  readonly execution: ExecutionResult
}

type CaseOutcome = { readonly value: string } | { readonly error: string }

const call = (functionName: string, args: readonly unknown[]): string =>
  `${functionName}(${args.map((a) => JSON.stringify(a)).join(', ')})`

// Le harnais demarre sur la premiere ligne du code soumis : les numeros de ligne des erreurs restent ceux de l'editeur.
// Il ecrit via `__scalarWrite`, capture avant ce code, derriere un `marker` aleatoire : le code soumis ne peut pas fausser le verdict.
export function buildHarness(
  code: string,
  functionName: string,
  cases: readonly VerificationCase[],
  marker: string,
): string {
  if (!FUNCTION_NAME_PATTERN.test(functionName)) {
    throw new Error(`Nom de fonction invalide : ${functionName}`)
  }
  const args = JSON.stringify(JSON.stringify(cases.map((c) => c.arguments)))
  return `const __scalarWrite = process.stdout.write.bind(process.stdout);${code}
;(() => {
  const fn = typeof ${functionName} === 'function' ? ${functionName} : null
  const results = fn === null ? null : JSON.parse(${args}).map((args) => {
    try {
      return { value: JSON.stringify(fn(...args) ?? null) }
    } catch (error) {
      return { error: String(error && error.message ? error.message : error) }
    }
  })
  __scalarWrite('\\n' + ${JSON.stringify(marker)} + JSON.stringify(results) + '\\n')
})()
`
}

function extract(
  stdout: string,
  marker: string,
): { readonly stdout: string; readonly outcomes: readonly CaseOutcome[] | null | undefined } {
  const index = stdout.lastIndexOf(marker)
  if (index === -1) {
    return { stdout, outcomes: undefined }
  }
  const line = stdout.slice(index + marker.length).split('\n')[0] ?? ''
  try {
    return {
      // Le harnais precede sa ligne d'un retour a la ligne : on le retire aussi.
      stdout: stdout.slice(0, Math.max(0, index - 1)),
      outcomes: JSON.parse(line) as CaseOutcome[] | null,
    }
  } catch {
    return { stdout, outcomes: undefined }
  }
}

function checkCase(
  c: VerificationCase,
  outcome: CaseOutcome | undefined,
  rank: number,
  functionName: string,
): VerificationCheck {
  const expected = JSON.stringify(c.expectedResult)
  const description = c.description ? ` (${c.description})` : ''
  const label = c.isHidden
    ? `Cas supplémentaire ${rank}`
    : `${call(functionName, c.arguments)} renvoie ${expected}${description}`

  if (outcome === undefined) {
    return { label, passed: false, detail: 'Cas non évalué.' }
  }
  if ('error' in outcome) {
    return {
      label,
      passed: false,
      detail: c.isHidden ? 'Le programme lève une erreur sur ce cas.' : `Erreur : ${outcome.error}`,
    }
  }
  // Comparaison structurelle : une base JSONB peut reordonner les cles d'un objet.
  let actual: unknown
  try {
    actual = JSON.parse(outcome.value)
  } catch {
    actual = undefined
  }
  if (isDeepStrictEqual(actual, c.expectedResult ?? null)) {
    return { label, passed: true, detail: null }
  }
  return {
    label,
    passed: false,
    detail: c.isHidden ? 'Résultat incorrect sur un cas non affiché.' : `Obtenu : ${outcome.value}`,
  }
}

export function readVerdict(
  execution: ExecutionResult,
  functionName: string,
  cases: readonly VerificationCase[],
  marker: string,
): VerificationResult {
  const { stdout, outcomes } = extract(execution.run.stdout, marker)
  const ran = execution.status === 'OK' && outcomes !== undefined

  const runs: VerificationCheck = {
    label: 'Le programme s’exécute',
    passed: ran,
    detail: ran
      ? null
      : execution.status === 'OK'
        ? 'Le programme s’est arrêté avant la fin : lisez la sortie d’erreur.'
        : execution.label,
  }
  const defined: VerificationCheck = {
    label: `La fonction ${functionName} est définie`,
    passed: outcomes !== null && outcomes !== undefined,
    detail:
      outcomes === null
        ? `Aucune fonction nommée ${functionName} : gardez le nom donné par la consigne.`
        : outcomes === undefined
          ? 'Non vérifié : le programme ne s’exécute pas jusqu’au bout.'
          : null,
  }

  const hiddenRanks = cases.map((_, i) => cases.slice(0, i + 1).filter((c) => c.isHidden).length)
  const caseChecks = cases.map((c, i) =>
    checkCase(c, outcomes?.[i], hiddenRanks[i] ?? 0, functionName),
  )

  const checks = [runs, defined, ...caseChecks]
  const passedCount = checks.filter((c) => c.passed).length
  return {
    passed: passedCount === checks.length,
    passedCount,
    total: checks.length,
    checks,
    // `output` melange les deux sorties, ligne du harnais comprise : reconstruit sans elle.
    execution: {
      ...execution,
      run: { ...execution.run, stdout, output: `${stdout}${execution.run.stderr}` },
    },
  }
}

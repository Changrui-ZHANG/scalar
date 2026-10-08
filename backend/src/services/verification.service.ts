/**
 * Correction d'un exercice : le code de l'apprenant tourne dans Piston, suivi
 * d'un petit harnais qui appelle sa fonction sur chaque cas de test (caches
 * compris) et ecrit les valeurs obtenues. La comparaison avec les valeurs
 * attendues se fait ici, jamais dans le moteur : le code soumis ne voit pas
 * les reponses.
 *
 * Executer et verifier restent deux choses distinctes : un code de sortie 0
 * ne dit rien de la justesse d'une solution.
 */
import { isDeepStrictEqual } from 'node:util'

import type { ExecutionResult } from './execution.service.ts'

export interface VerificationCase {
  readonly args: readonly unknown[]
  readonly expected: unknown
  readonly label: string | null
  readonly isHidden: boolean
}

export interface VerificationCheck {
  readonly label: string
  readonly passed: boolean
  /** Ce qui ne va pas, en francais ; null quand le critere passe. */
  readonly detail: string | null
}

export interface VerificationResult {
  /** Vrai seulement si tous les criteres passent. */
  readonly passed: boolean
  readonly passedCount: number
  readonly total: number
  readonly checks: readonly VerificationCheck[]
  /** Execution brute, la ligne du harnais retiree de la sortie standard. */
  readonly execution: ExecutionResult
}

type CaseOutcome = { readonly value: string } | { readonly error: string }

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

const call = (functionName: string, args: readonly unknown[]): string =>
  `${functionName}(${args.map((a) => JSON.stringify(a)).join(', ')})`

/**
 * Code envoye au moteur : celui de l'apprenant, puis le harnais.
 *
 * L'ecriture sur la sortie standard est capturee sur la meme ligne que le
 * debut du code soumis : les numeros de ligne des erreurs restent ceux de
 * l'editeur, et un `console.log` redefini ne peut pas fausser le verdict.
 * `marker` est tire au hasard a chaque verification : le code soumis ne peut
 * pas imprimer un faux resultat.
 */
// Un apprenant determine peut toujours tricher (il execute du code) ;
// la correction sert l'apprentissage, pas un examen.
export function buildHarness(
  code: string,
  functionName: string,
  cases: readonly VerificationCase[],
  marker: string,
): string {
  if (!IDENTIFIER.test(functionName)) {
    throw new Error(`Nom de fonction invalide : ${functionName}`)
  }
  const args = JSON.stringify(JSON.stringify(cases.map((c) => c.args)))
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

/** Les resultats du harnais, et la sortie standard sans sa ligne. */
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
  const expected = JSON.stringify(c.expected)
  const label = c.isHidden
    ? `Cas supplémentaire ${rank}`
    : `${call(functionName, c.args)} renvoie ${expected}${c.label ? ` (${c.label})` : ''}`

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
  if (isDeepStrictEqual(actual, c.expected ?? null)) {
    return { label, passed: true, detail: null }
  }
  return {
    label,
    passed: false,
    detail: c.isHidden ? 'Résultat incorrect sur un cas non affiché.' : `Obtenu : ${outcome.value}`,
  }
}

/** Traduit l'execution du harnais en criteres lisibles. */
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

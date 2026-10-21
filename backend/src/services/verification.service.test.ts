import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

import type { ExecutionResult } from './execution.service.ts'
import type { VerificationCase } from './verification.service.ts'
import { buildHarness, readVerdict } from './verification.service.ts'

const MARKER = '__scalar_test__'

const CASES: readonly VerificationCase[] = [
  { arguments: [4], expectedResult: true, description: null, isHidden: false },
  { arguments: [7], expectedResult: false, description: 'impair', isHidden: false },
  { arguments: [0], expectedResult: true, description: null, isHidden: true },
]

/** Fait tourner le harnais dans un vrai Node, comme le ferait Piston. */
function verify(code: string, cases: readonly VerificationCase[] = CASES) {
  const run = spawnSync(process.execPath, ['-e', buildHarness(code, 'isEven', cases, MARKER)], {
    encoding: 'utf8',
  })
  const execution: ExecutionResult = {
    status: run.status === 0 ? 'OK' : 'RE',
    label: run.status === 0 ? 'Terminé' : 'Erreur d’exécution',
    run: {
      stdout: run.stdout,
      stderr: run.stderr,
      output: run.stdout + run.stderr,
      code: run.status,
      signal: null,
      status: run.status === 0 ? null : 'RE',
    },
  }
  return readVerdict(execution, 'isEven', cases, MARKER)
}

describe('vérification d’un exercice', () => {
  it('valide une solution juste et rend la sortie de l’apprenant sans la ligne du harnais', () => {
    const result = verify('function isEven(n) {\n  return n % 2 === 0\n}\nconsole.log("ok")')
    expect(result.passed).toBe(true)
    expect(result.passedCount).toBe(result.total)
    expect(result.execution.run.stdout).toBe('ok\n')
    expect(result.execution.run.output.includes(MARKER)).toBe(false)
  })

  it('un code qui s’exécute sans erreur mais renvoie faux échoue', () => {
    const result = verify('function isEven(n) {\n  return true\n}')
    expect(result.passed).toBe(false)
    expect(result.checks[0]?.passed).toBe(true)
    const failed = result.checks.filter((c) => !c.passed)
    expect(failed.map((c) => [c.label, c.detail])).toEqual([
      ['isEven(7) renvoie false (impair)', 'Obtenu : true'],
    ])
  })

  it('ne révèle rien d’un cas caché', () => {
    const result = verify('function isEven(n) {\n  return n === 4\n}')
    const hidden = result.checks.find((c) => c.label === 'Cas supplémentaire 1')
    expect(hidden?.passed).toBe(false)
    expect(hidden?.detail).toBe('Résultat incorrect sur un cas non affiché.')
  })

  it('signale une fonction absente ou mal nommée', () => {
    const result = verify('function estPair(n) {\n  return n % 2 === 0\n}')
    expect(result.passed).toBe(false)
    expect(result.checks[1]?.detail ?? '').toMatch(/Aucune fonction nommée isEven/)
  })

  it('un programme qui plante ne passe aucun critère', () => {
    const result = verify('throw new Error("boum")')
    expect(result.passedCount).toBe(0)
    expect(result.execution.run.stderr).toMatch(/boum/)
  })

  it('un faux résultat imprimé par l’apprenant ne trompe pas la correction', () => {
    const result = verify(
      'function isEven() { return 1 }\nconsole.log("__fake__" + JSON.stringify([{value:"true"}]))',
    )
    expect(result.passed).toBe(false)
  })

  it('refuse un nom de fonction qui n’est pas un identifiant', () => {
    expect(() => buildHarness('', 'x); process.exit(0', CASES, MARKER)).toThrow()
  })
})

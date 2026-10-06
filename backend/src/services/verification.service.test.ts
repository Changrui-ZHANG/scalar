import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'

import type { ExecutionResult } from './execution.service.ts'
import type { VerificationCase } from './verification.service.ts'
import { buildHarness, readVerdict } from './verification.service.ts'

const MARKER = '__scalar_test__'

const CASES: readonly VerificationCase[] = [
  { args: [4], expected: true, label: null, isHidden: false },
  { args: [7], expected: false, label: 'impair', isHidden: false },
  { args: [0], expected: true, label: null, isHidden: true },
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
    assert.equal(result.passed, true)
    assert.equal(result.passedCount, result.total)
    assert.equal(result.execution.run.stdout, 'ok\n')
    assert.equal(result.execution.run.output.includes(MARKER), false)
  })

  it('un code qui s’exécute sans erreur mais renvoie faux échoue', () => {
    const result = verify('function isEven(n) {\n  return true\n}')
    assert.equal(result.passed, false)
    assert.equal(result.checks[0]?.passed, true)
    const failed = result.checks.filter((c) => !c.passed)
    assert.deepEqual(
      failed.map((c) => [c.label, c.detail]),
      [['isEven(7) renvoie false (impair)', 'Obtenu : true']],
    )
  })

  it('ne révèle rien d’un cas caché', () => {
    const result = verify('function isEven(n) {\n  return n === 4\n}')
    const hidden = result.checks.find((c) => c.label === 'Cas supplémentaire 1')
    assert.equal(hidden?.passed, false)
    assert.equal(hidden?.detail, 'Résultat incorrect sur un cas non affiché.')
  })

  it('signale une fonction absente ou mal nommée', () => {
    const result = verify('function estPair(n) {\n  return n % 2 === 0\n}')
    assert.equal(result.passed, false)
    assert.match(result.checks[1]?.detail ?? '', /Aucune fonction nommée isEven/)
  })

  it('un programme qui plante ne passe aucun critère', () => {
    const result = verify('throw new Error("boum")')
    assert.equal(result.passedCount, 0)
    assert.match(result.execution.run.stderr, /boum/)
  })

  it('un faux résultat imprimé par l’apprenant ne trompe pas la correction', () => {
    const result = verify(
      'function isEven() { return 1 }\nconsole.log("__fake__" + JSON.stringify([{value:"true"}]))',
    )
    assert.equal(result.passed, false)
  })

  it('refuse un nom de fonction qui n’est pas un identifiant', () => {
    assert.throws(() => buildHarness('', 'x); process.exit(0', CASES, MARKER))
  })
})

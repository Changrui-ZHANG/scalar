import { describe, expect, it } from 'vitest'
import { CODE_ECHEC_TYPAGE, type RunnerCallbackBody } from '@scalar/shared/runner.ts'
import { classifierResultatBrut } from '../src/services/submission.service.ts'

// Fonction pure, sans base de donnees : ces cas s'executent donc toujours,
// meme sans `MONGODB_URI_TEST` (meme patron que
// `interpretation-verdict.test.ts`). Reprend la matrice I/O de spec-2-6.
function corps(surcharges: Partial<RunnerCallbackBody> = {}): RunnerCallbackBody {
  return {
    exitCode: 0,
    signal: null,
    output: '',
    outputTruncated: false,
    finishedAt: new Date().toISOString(),
    timedOut: false,
    tests: [],
    ...surcharges,
  }
}

describe('classifierResultatBrut', () => {
  it('rend passed quand exitCode est 0', () => {
    expect(classifierResultatBrut(corps({ exitCode: 0 }))).toEqual({ verdict: 'passed' })
  })

  it('rend failed/apprenant quand au moins un test a echoue', () => {
    expect(
      classifierResultatBrut(
        corps({ exitCode: 1, tests: [{ name: 'x', status: 'failed', expected: '5', actual: '4' }] }),
      ),
    ).toEqual({ verdict: 'failed', failureOrigin: 'apprenant' })
  })

  it('rend error/apprenant famille typage quand exitCode est le code dedie', () => {
    expect(classifierResultatBrut(corps({ exitCode: CODE_ECHEC_TYPAGE }))).toEqual({
      verdict: 'error',
      failureOrigin: 'apprenant',
    })
  })

  it('rend error/apprenant quand exitCode est non nul sans test failed (exception non interceptee)', () => {
    expect(classifierResultatBrut(corps({ exitCode: 1, tests: [] }))).toEqual({
      verdict: 'error',
      failureOrigin: 'apprenant',
    })
  })

  it('rend timeout quand timedOut est vrai, quel que soit le reste du corps', () => {
    expect(classifierResultatBrut(corps({ exitCode: null, signal: 'SIGKILL', timedOut: true }))).toEqual({
      verdict: 'timeout',
      failureOrigin: 'apprenant',
    })
  })

  it('rend error/plateforme quand exitCode est nul hors timeout (echec runner avant toute execution)', () => {
    expect(classifierResultatBrut(corps({ exitCode: null, timedOut: false }))).toEqual({
      verdict: 'error',
      failureOrigin: 'plateforme',
    })
  })

  it('ne classe jamais failed quand exitCode est nul, meme si un test porte le statut failed', () => {
    // Corps incoherent qu'aucun wrapper reel ne produit (voir le commentaire
    // de `classifierResultatBrut`) : verifie que la robustesse tient quand
    // meme, plateforme prime sur le detail par test.
    expect(
      classifierResultatBrut(
        corps({ exitCode: null, timedOut: false, tests: [{ name: 'x', status: 'failed' }] }),
      ),
    ).toEqual({ verdict: 'error', failureOrigin: 'plateforme' })
  })

  it('timedOut prime sur un code de typage ou un detail de test', () => {
    expect(
      classifierResultatBrut(
        corps({ exitCode: CODE_ECHEC_TYPAGE, timedOut: true, tests: [{ name: 'x', status: 'failed' }] }),
      ),
    ).toEqual({ verdict: 'timeout', failureOrigin: 'apprenant' })
  })
})

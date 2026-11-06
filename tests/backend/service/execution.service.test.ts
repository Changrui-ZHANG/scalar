import { afterEach, describe, expect, it, vi } from 'vitest'

import { MAX_CODE_BYTES } from '../../../backend/src/constants.ts'
import {
  EngineUnavailableError,
  executeCode,
  hasJavascriptRuntime,
  parseSubmission,
  toExecutionStatus,
  toJavaScript,
} from '../../../backend/src/service/execution.service.ts'

const RUN_NOMINAL = {
  stdout: '2\n',
  stderr: '',
  output: '2\n',
  code: 0,
  signal: null,
  status: null,
  cpu_time: 12,
  wall_time: 34,
  memory: 8192,
}

function reponsePiston(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'content-type': 'application/json' },
  })
}

describe('parseSubmission', () => {
  it('accepte un script non vide, en JavaScript par défaut pour les anciens clients', () => {
    const resultat = parseSubmission({ code: 'console.log(1)' })

    expect(resultat.ok).toBe(true)
    expect(resultat.ok && resultat.submission).toEqual({
      code: 'console.log(1)',
      programmingLanguage: 'javascript',
    })
  })

  it('refuse un corps sans champ « code », ou d’un autre type', () => {
    expect(parseSubmission({}).ok).toBe(false)
    expect(parseSubmission({ code: 42 }).ok).toBe(false)
    expect(parseSubmission({ code: null }).ok).toBe(false)
    expect(parseSubmission(undefined).ok).toBe(false)
    expect(parseSubmission({ data: 'console.log(1)' }).ok).toBe(false)
  })

  it('refuse une soumission vide ou faite d’espaces, avec un message exploitable', () => {
    for (const code of ['', '   \n\t ']) {
      const resultat = parseSubmission({ code })
      expect(resultat.ok).toBe(false)
      expect(resultat.ok ? '' : resultat.error).toMatch(/vide/i)
    }
  })

  it('refuse au-delà de la taille maximale, et accepte juste en dessous', () => {
    expect(parseSubmission({ code: 'a'.repeat(MAX_CODE_BYTES) }).ok).toBe(true)
    expect(parseSubmission({ code: 'a'.repeat(MAX_CODE_BYTES + 1) }).ok).toBe(false)
  })

  it('compte des octets et non des caractères', () => {
    const presqueDeuxFois = '€'.repeat(MAX_CODE_BYTES / 2)
    expect(parseSubmission({ code: presqueDeuxFois }).ok).toBe(false)
  })
})

describe('toExecutionStatus', () => {
  it('garde les échecs qualifiés et ne prend jamais un statut inconnu pour un succès', () => {
    const attendus: ReadonlyArray<readonly [string | null | undefined, string]> = [
      [null, 'OK'],
      [undefined, 'OK'],
      ...(['TO', 'OL', 'EL', 'RE', 'SG'] as const).map((s) => [s, s] as const),
      ['ZZ', 'XX'],
      ['', 'XX'],
      ['OK', 'XX'],
    ]
    for (const [statut, attendu] of attendus) {
      expect(toExecutionStatus(statut), String(statut)).toBe(attendu)
    }
  })
})

describe('executeCode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restitue le résultat complet d’une exécution réussie', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      reponsePiston({ run: RUN_NOMINAL }),
    )

    const resultat = await executeCode('console.log(1 + 1)')

    expect(resultat.status).toBe('OK')
    expect(resultat.label).toBe('Terminé')
    expect(resultat.run).toEqual(RUN_NOMINAL)
  })

  it('traite un dépassement de temps comme un échec, malgré un HTTP 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      reponsePiston({
        run: { ...RUN_NOMINAL, stdout: '', output: '', status: 'TO', signal: 'SIGKILL' },
      }),
    )

    const resultat = await executeCode('while (true) {}')

    expect(resultat.status).toBe('TO')
    expect(resultat.label).toBe('Temps dépassé')
  })

  it('épingle la version et aligne les limites sur celles du moteur', async () => {
    const appels: Array<{ url: string; corps: Record<string, unknown> }> = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: unknown, init: unknown) => {
      appels.push({
        url: String(url),
        corps: JSON.parse(String((init as { body: string }).body)),
      })
      return reponsePiston({ run: RUN_NOMINAL })
    })

    await executeCode('console.log(1)')

    expect(appels.length).toBe(1)
    expect(appels[0]!.url).toMatch(/\/execute$/)
    expect(appels[0]!.corps.language).toBe('javascript')
    expect(String(appels[0]!.corps.version)).toMatch(/^\d+\.\d+\.\d+$/)
    expect(appels[0]!.corps.run_timeout).toBe(5000)
    expect(appels[0]!.corps.run_cpu_time).toBe(5000)
  })
})

describe('programmingLanguage des soumissions', () => {
  it('garde un langage de l’enum, et refuse toute autre valeur', () => {
    const ts = parseSubmission({ code: 'let x: number = 1', programmingLanguage: 'typescript' })
    expect(ts.ok && ts.submission.programmingLanguage).toBe('typescript')
    for (const programmingLanguage of ['python', '', 42, null]) {
      const refus = parseSubmission({ code: 'print(1)', programmingLanguage })
      expect(refus.ok).toBe(false)
      expect(refus.ok ? '' : refus.error).toMatch(/programmingLanguage/)
    }
  })
})

describe('toJavaScript', () => {
  it('laisse le JavaScript intact', () => {
    expect(toJavaScript('javascript', 'let x: 1')).toEqual({ ok: true, code: 'let x: 1' })
  })

  it('retire les types sans déplacer une seule ligne ni colonne', () => {
    const source = 'function f(a: number): number {\n  return a *\n    2\n}\nundefinedCall()'
    const converted = toJavaScript('typescript', source)

    expect(converted.ok).toBe(true)
    if (!converted.ok) return
    const lines = converted.code.split('\n')
    expect(lines.length).toBe(source.split('\n').length)
    expect(lines[4]).toBe('undefinedCall()')
    expect(converted.code.indexOf('return')).toBe(source.indexOf('return'))
    expect(converted.code.includes('number')).toBe(false)
  })

  it('refuse les syntaxes qui génèrent du code, avec un message clair', () => {
    const converted = toJavaScript('typescript', 'enum Couleur { Rouge }')

    expect(converted.ok).toBe(false)
    expect(converted.ok ? '' : converted.error).toMatch(/enum/)
  })

  it('restitue le message d’une erreur de syntaxe TypeScript', () => {
    const converted = toJavaScript('typescript', 'function f(a: number) {\n  return a +\n}')

    expect(converted.ok).toBe(false)
    expect(converted.ok ? '' : converted.error).toMatch(/^Erreur de syntaxe TypeScript : .+\.$/)
  })
})

describe('panne du moteur', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['injoignable', () => Promise.reject(new TypeError('fetch failed')), /fetch failed/],
    ['erreur HTTP', async () => reponsePiston({ message: 'boom' }, 400), /400/],
    ['réponse sans étage « run »', async () => reponsePiston({ language: 'javascript' }), /run/],
  ])('%s : lève EngineUnavailableError en gardant la cause', async (_cas, reponse, message) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(reponse)

    const erreur = await executeCode('console.log(1)').catch((e: unknown) => e)

    expect(erreur).toBeInstanceOf(EngineUnavailableError)
    expect((erreur as Error).cause).toBeInstanceOf(Error)
    expect((erreur as Error).message).toMatch(message)
  })
})

describe('hasJavascriptRuntime', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['par son nom', [{ language: 'javascript' }], true],
    ['par un alias', [{ language: 'node', aliases: ['javascript'] }], true],
    ['absent', [{ language: 'python', aliases: ['py'] }], false],
  ])('trouve le runtime %s', async (_cas, runtimes, attendu) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => reponsePiston(runtimes))

    expect(await hasJavascriptRuntime()).toBe(attendu)
  })

  it.each([
    ['injoignable', () => Promise.reject(new TypeError('fetch failed'))],
    ['erreur HTTP', async () => reponsePiston({ message: 'boom' }, 500)],
  ])('moteur %s : répond non sans lever', async (_cas, reponse) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(reponse)

    expect(await hasJavascriptRuntime()).toBe(false)
  })
})

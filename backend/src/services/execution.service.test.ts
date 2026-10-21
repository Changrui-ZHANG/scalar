import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  MAX_CODE_BYTES,
  executeCode,
  parseSubmission,
  toExecutionStatus,
  toJavaScript,
} from './execution.service.ts'

/** Etage `run` minimal, complete au besoin par chaque cas. */
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
  it('accepte un corps portant un script non vide', () => {
    const resultat = parseSubmission({ code: 'console.log(1)' })

    expect(resultat.ok).toBe(true)
    expect(resultat.ok && resultat.submission.code).toBe('console.log(1)')
  })

  it('refuse un corps sans champ « code », ou d’un autre type', () => {
    expect(parseSubmission({}).ok).toBe(false)
    expect(parseSubmission({ code: 42 }).ok).toBe(false)
    expect(parseSubmission({ code: null }).ok).toBe(false)
    expect(parseSubmission(undefined).ok).toBe(false)
    // Le champ historique s'appelait `data` : un ancien client doit etre
    // refuse explicitement, pas execute avec un code vide.
    expect(parseSubmission({ data: 'console.log(1)' }).ok).toBe(false)
  })

  it('refuse une soumission vide ou faite d’espaces', () => {
    expect(parseSubmission({ code: '' }).ok).toBe(false)
    expect(parseSubmission({ code: '   \n\t ' }).ok).toBe(false)
  })

  it('refuse au-delà de la taille maximale, et accepte juste en dessous', () => {
    expect(parseSubmission({ code: 'a'.repeat(MAX_CODE_BYTES) }).ok).toBe(true)
    expect(parseSubmission({ code: 'a'.repeat(MAX_CODE_BYTES + 1) }).ok).toBe(false)
  })

  it('compte des octets et non des caractères', () => {
    // Un caractere hors ASCII pese plusieurs octets : compter en `length`
    // laisserait passer une charge utile au-dessus de la limite reelle.
    const presqueDeuxFois = '€'.repeat(MAX_CODE_BYTES / 2)
    expect(parseSubmission({ code: presqueDeuxFois }).ok).toBe(false)
  })

  it('renvoie un message exploitable par le client', () => {
    const resultat = parseSubmission({ code: '' })

    expect(resultat.ok).toBe(false)
    expect(resultat.ok === false ? resultat.error : '').toMatch(/vide/i)
  })
})

describe('toExecutionStatus', () => {
  it('traduit l’absence de statut en succès', () => {
    // Piston renvoie `null` quand l'execution est allee a son terme.
    expect(toExecutionStatus(null)).toBe('OK')
    expect(toExecutionStatus(undefined)).toBe('OK')
  })

  it('conserve les échecs qualifiés', () => {
    expect(toExecutionStatus('TO')).toBe('TO')
    expect(toExecutionStatus('OL')).toBe('OL')
    expect(toExecutionStatus('EL')).toBe('EL')
    expect(toExecutionStatus('RE')).toBe('RE')
    expect(toExecutionStatus('SG')).toBe('SG')
  })

  it('ne prend jamais un statut inconnu pour un succès', () => {
    // Le piege central : traiter un statut non reconnu comme une reussite
    // afficherait « Terminé, sortie vide » sur une boucle infinie.
    expect(toExecutionStatus('ZZ')).toBe('XX')
    expect(toExecutionStatus('')).toBe('XX')
    expect(toExecutionStatus('OK')).toBe('XX')
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
    // Le piege d'integration principal : Piston renvoie 200 sur un timeout.
    // Se fier au seul code HTTP afficherait « Terminé, sortie vide ».
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
    // Jamais « derniere en date » : une version que Piston n'a pas donne un 400.
    expect(String(appels[0]!.corps.version)).toMatch(/^\d+\.\d+\.\d+$/)
    // Doit rester egal a PISTON_RUN_TIMEOUT dans compose.yaml : au-dela,
    // Piston refuse en 400 au lieu de raboter.
    expect(appels[0]!.corps.run_timeout).toBe(5000)
    expect(appels[0]!.corps.run_cpu_time).toBe(5000)
  })

  it('lève quand le moteur répond une erreur HTTP', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      reponsePiston({ message: 'runtime is unknown' }, 400),
    )

    await expect(executeCode('console.log(1)')).rejects.toThrow(/400/)
  })

  it('lève quand la réponse ne porte pas d’étage « run »', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      reponsePiston({ language: 'javascript' }),
    )

    await expect(executeCode('console.log(1)')).rejects.toThrow(/run/)
  })
})

describe('programmingLanguage des soumissions', () => {
  it('suppose JavaScript quand le champ est absent, pour les anciens clients', () => {
    const resultat = parseSubmission({ code: 'console.log(1)' })
    expect(resultat.ok && resultat.submission.programmingLanguage).toBe('javascript')
  })

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
    // L'appel fautif reste a la ligne 5, colonne 1 : l'erreur affichee pointe
    // exactement ce que l'apprenant voit a l'ecran.
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

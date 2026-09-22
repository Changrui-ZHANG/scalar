import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  MAX_CODE_BYTES,
  executeCode,
  parseSubmission,
  toExecutionStatus,
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

    assert.equal(resultat.ok, true)
    assert.equal(resultat.ok && resultat.submission.code, 'console.log(1)')
  })

  it('refuse un corps sans champ « code », ou d’un autre type', () => {
    assert.equal(parseSubmission({}).ok, false)
    assert.equal(parseSubmission({ code: 42 }).ok, false)
    assert.equal(parseSubmission({ code: null }).ok, false)
    assert.equal(parseSubmission(undefined).ok, false)
    // Le champ historique s'appelait `data` : un ancien client doit etre
    // refuse explicitement, pas execute avec un code vide.
    assert.equal(parseSubmission({ data: 'console.log(1)' }).ok, false)
  })

  it('refuse une soumission vide ou faite d’espaces', () => {
    assert.equal(parseSubmission({ code: '' }).ok, false)
    assert.equal(parseSubmission({ code: '   \n\t ' }).ok, false)
  })

  it('refuse au-delà de la taille maximale, et accepte juste en dessous', () => {
    assert.equal(parseSubmission({ code: 'a'.repeat(MAX_CODE_BYTES) }).ok, true)
    assert.equal(parseSubmission({ code: 'a'.repeat(MAX_CODE_BYTES + 1) }).ok, false)
  })

  it('compte des octets et non des caractères', () => {
    // Un caractere hors ASCII pese plusieurs octets : compter en `length`
    // laisserait passer une charge utile au-dessus de la limite reelle.
    const presqueDeuxFois = '€'.repeat(MAX_CODE_BYTES / 2)
    assert.equal(parseSubmission({ code: presqueDeuxFois }).ok, false)
  })

  it('renvoie un message exploitable par le client', () => {
    const resultat = parseSubmission({ code: '' })

    assert.equal(resultat.ok, false)
    assert.match(resultat.ok === false ? resultat.error : '', /vide/i)
  })
})

describe('toExecutionStatus', () => {
  it('traduit l’absence de statut en succès', () => {
    // Piston renvoie `null` quand l'execution est allee a son terme.
    assert.equal(toExecutionStatus(null), 'OK')
    assert.equal(toExecutionStatus(undefined), 'OK')
  })

  it('conserve les échecs qualifiés', () => {
    assert.equal(toExecutionStatus('TO'), 'TO')
    assert.equal(toExecutionStatus('OL'), 'OL')
    assert.equal(toExecutionStatus('EL'), 'EL')
    assert.equal(toExecutionStatus('RE'), 'RE')
    assert.equal(toExecutionStatus('SG'), 'SG')
  })

  it('ne prend jamais un statut inconnu pour un succès', () => {
    // Le piege central : traiter un statut non reconnu comme une reussite
    // afficherait « Terminé, sortie vide » sur une boucle infinie.
    assert.equal(toExecutionStatus('ZZ'), 'XX')
    assert.equal(toExecutionStatus(''), 'XX')
    assert.equal(toExecutionStatus('OK'), 'XX')
  })
})

describe('executeCode', () => {
  it('restitue le résultat complet d’une exécution réussie', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => reponsePiston({ run: RUN_NOMINAL }))

    const resultat = await executeCode('console.log(1 + 1)')

    assert.equal(resultat.status, 'OK')
    assert.equal(resultat.label, 'Terminé')
    assert.deepEqual(resultat.run, RUN_NOMINAL)
  })

  it('traite un dépassement de temps comme un échec, malgré un HTTP 200', async (t) => {
    // Le piege d'integration principal : Piston renvoie 200 sur un timeout.
    // Se fier au seul code HTTP afficherait « Terminé, sortie vide ».
    t.mock.method(globalThis, 'fetch', async () =>
      reponsePiston({
        run: { ...RUN_NOMINAL, stdout: '', output: '', status: 'TO', signal: 'SIGKILL' },
      }),
    )

    const resultat = await executeCode('while (true) {}')

    assert.equal(resultat.status, 'TO')
    assert.equal(resultat.label, 'Temps dépassé')
  })

  it('épingle la version et aligne les limites sur celles du moteur', async (t) => {
    const appels: Array<{ url: string; corps: Record<string, unknown> }> = []
    t.mock.method(globalThis, 'fetch', async (url: unknown, init: unknown) => {
      appels.push({
        url: String(url),
        corps: JSON.parse(String((init as { body: string }).body)),
      })
      return reponsePiston({ run: RUN_NOMINAL })
    })

    await executeCode('console.log(1)')

    assert.equal(appels.length, 1)
    assert.match(appels[0]!.url, /\/execute$/)
    assert.equal(appels[0]!.corps.language, 'javascript')
    // Jamais « derniere en date » : une version que Piston n'a pas donne un 400.
    assert.match(String(appels[0]!.corps.version), /^\d+\.\d+\.\d+$/)
    // Doit rester egal a PISTON_RUN_TIMEOUT dans compose.yaml : au-dela,
    // Piston refuse en 400 au lieu de raboter.
    assert.equal(appels[0]!.corps.run_timeout, 5000)
    assert.equal(appels[0]!.corps.run_cpu_time, 5000)
  })

  it('lève quand le moteur répond une erreur HTTP', async (t) => {
    t.mock.method(globalThis, 'fetch', async () =>
      reponsePiston({ message: 'runtime is unknown' }, 400),
    )

    await assert.rejects(executeCode('console.log(1)'), /400/)
  })

  it('lève quand la réponse ne porte pas d’étage « run »', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => reponsePiston({ language: 'javascript' }))

    await assert.rejects(executeCode('console.log(1)'), /run/)
  })
})

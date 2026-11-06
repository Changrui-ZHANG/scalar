import { describe, expect, it } from 'vitest'

import { CONTENT } from '../../../backend/src/database/seed.ts'
import { InMemoryCertificateRepository } from '../../../backend/src/repository/certificate.repository.ts'
import { InMemoryExerciseRepository } from '../../../backend/src/repository/exercise.repository.ts'
import { InMemoryProgressRepository } from '../../../backend/src/repository/progress.repository.ts'
import { InMemoryTrackRepository } from '../../../backend/src/repository/track.repository.ts'
import { InMemoryUserRepository } from '../../../backend/src/repository/user.repository.ts'
import {
  CertificateService,
  generateCertificateCode,
} from '../../../backend/src/service/certificate.service.ts'

const JAVASCRIPT = CONTENT.tracks.find((t) => t.slug === 'javascript')!
const javascriptExercises = CONTENT.exercises.filter((e) =>
  CONTENT.chapters.some((c) => c.id === e.chapterId && c.trackId === JAVASCRIPT.id),
)
const request = { track: 'javascript', holderName: 'Ada Lovelace' }

async function open() {
  const users = new InMemoryUserRepository()
  const progress = new InMemoryProgressRepository()
  const certificates = new InMemoryCertificateRepository()
  const exercises = new InMemoryExerciseRepository()
  const service = new CertificateService(
    certificates,
    users,
    progress,
    new InMemoryTrackRepository(),
    exercises,
  )
  const { id } = await users.createAnonymous()
  const pass = (exerciseIds: readonly number[]) =>
    Promise.all(exerciseIds.map((e) => progress.recordAttempt(id, e, true, new Date())))
  return { service, users, progress, certificates, exercises, id, pass }
}

describe('generateCertificateCode', () => {
  it('produit des codes lisibles, sans caractère ambigu, tous différents', () => {
    const codes = Array.from({ length: 1_000 }, generateCertificateCode)

    for (const code of codes) {
      expect(code).toMatch(/^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/)
    }
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('CertificateService', () => {
  it('délivre le certificat quand tous les exercices du parcours sont réussis', async () => {
    const { service, id, pass } = await open()
    await pass(javascriptExercises.map((e) => e.id))

    const outcome = await service.issue(id, request)

    expect(outcome).toEqual({
      status: 'issued',
      certificate: {
        code: expect.any(String),
        holderName: 'Ada Lovelace',
        track: { slug: 'javascript', name: 'JavaScript' },
        issuedAt: expect.any(Date),
      },
    })
  })

  it('refuse tant qu’un exercice manque, même réussi ailleurs ou seulement tenté', async () => {
    const { service, progress, id, pass } = await open()
    const [last, ...others] = javascriptExercises
    await pass(others.map((e) => e.id))
    await progress.recordAttempt(id, last!.id, false, new Date())

    expect(await service.issue(id, request)).toEqual({ status: 'not-completed' })
  })

  it('refuse un parcours sans exercice', async () => {
    const { service, id } = await open()

    expect(await service.issue(id, { ...request, track: 'conception' })).toEqual({
      status: 'not-completed',
    })
  })

  it('redemandé, renvoie le même certificat sans changer le nom figé', async () => {
    const { service, id, pass } = await open()
    await pass(javascriptExercises.map((e) => e.id))
    const first = await service.issue(id, request)

    const again = await service.issue(id, { ...request, holderName: 'Autre nom' })

    expect(again).toEqual({
      status: 'existing',
      certificate: first.status === 'issued' ? first.certificate : null,
    })
  })

  it('répond « introuvable » pour un apprenant ou un parcours inconnu', async () => {
    const { service, id } = await open()

    expect(await service.issue('00000000-0000-4000-8000-000000000000', request)).toEqual({
      status: 'learner-not-found',
    })
    expect(await service.issue(id, { ...request, track: 'python' })).toEqual({
      status: 'track-not-found',
    })
  })

  it('vérifie un certificat par son code, sans tenir compte de la casse', async () => {
    const { service, id, pass } = await open()
    await pass(javascriptExercises.map((e) => e.id))
    const issued = await service.issue(id, request)
    const code = issued.status === 'issued' ? issued.certificate.code : ''

    expect(await service.verify(code.toLowerCase())).toMatchObject({
      code,
      holderName: 'Ada Lovelace',
    })
    expect(await service.verify('AAAAA-AAAAA')).toBeNull()
    expect(await service.listForLearner(id)).toEqual([expect.objectContaining({ code })])
  })

  it('garde un certificat valable quand son parcours a été dépublié depuis', async () => {
    const { service, users, progress, certificates, exercises, id, pass } = await open()
    await pass(javascriptExercises.map((e) => e.id))
    const issued = await service.issue(id, request)
    const code = issued.status === 'issued' ? issued.certificate.code : ''
    const withoutTracks = new CertificateService(
      certificates,
      users,
      progress,
      new InMemoryTrackRepository([], []),
      exercises,
    )

    expect(await withoutTracks.verify(code)).toMatchObject({ code, track: null })
  })
})

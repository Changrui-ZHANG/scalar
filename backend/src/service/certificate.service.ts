import { randomInt } from 'node:crypto'

import { z } from 'zod'

import type { Certificate } from '../entity/certificate.entity.ts'
import type { CertificateRepository } from '../repository/certificate.repository.ts'
import type { ExerciseRepository } from '../repository/exercise.repository.ts'
import type { ProgressRepository } from '../repository/progress.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import type { UserRepository } from '../repository/user.repository.ts'
import type { TrackLink } from './track.service.ts'
import { toTrackLink } from './track.service.ts'

// Sans 0/O ni 1/I/L : un code recopie a la main reste juste. 31^10 codes possibles.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_LENGTH = 10

export const certificateRequestSchema = z.object({
  track: z.string('Le champ « track » est requis.').min(1, 'Le champ « track » est requis.'),
  holderName: z
    .string('Le champ « holderName » est requis.')
    .trim()
    .min(1, 'Le nom affiché sur le certificat est vide.')
    .max(100, 'Le nom affiché sur le certificat dépasse 100 caractères.'),
})

export type CertificateRequest = z.infer<typeof certificateRequestSchema>

/** Sans l'id de l'apprenant : la page de verification est publique. */
export interface CertificateView {
  readonly code: string
  readonly holderName: string
  readonly track: TrackLink | null
  readonly issuedAt: Date
}

export type IssueOutcome =
  | { readonly status: 'issued' | 'existing'; readonly certificate: CertificateView }
  | { readonly status: 'learner-not-found' | 'track-not-found' | 'not-completed' }

export function generateCertificateCode(): string {
  const chars = Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  )
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`
}

export class CertificateService {
  private readonly certificates: CertificateRepository
  private readonly users: UserRepository
  private readonly progress: ProgressRepository
  private readonly tracks: TrackRepository
  private readonly exercises: ExerciseRepository

  constructor(
    certificates: CertificateRepository,
    users: UserRepository,
    progress: ProgressRepository,
    tracks: TrackRepository,
    exercises: ExerciseRepository,
  ) {
    this.certificates = certificates
    this.users = users
    this.progress = progress
    this.tracks = tracks
    this.exercises = exercises
  }

  async issue(learnerId: string, request: CertificateRequest): Promise<IssueOutcome> {
    if ((await this.users.findById(learnerId)) === null) {
      return { status: 'learner-not-found' }
    }
    const track = await this.tracks.findTrackBySlug(request.track)
    if (!track) {
      return { status: 'track-not-found' }
    }
    const existing = (await this.certificates.listCertificates(learnerId)).find(
      (c) => c.trackId === track.id,
    )
    if (existing) {
      return { status: 'existing', certificate: await this.toView(existing) }
    }
    if (!(await this.hasCompleted(learnerId, track.id))) {
      return { status: 'not-completed' }
    }
    const issued = await this.certificates.issue({
      code: generateCertificateCode(),
      userId: learnerId,
      trackId: track.id,
      holderName: request.holderName,
      issuedAt: new Date(),
    })
    return { status: 'issued', certificate: await this.toView(issued) }
  }

  async verify(code: string): Promise<CertificateView | null> {
    const certificate = await this.certificates.findByCode(code.toUpperCase())
    return certificate && this.toView(certificate)
  }

  /** Du plus ancien au plus recent. */
  async listForLearner(learnerId: string): Promise<readonly CertificateView[]> {
    const certificates = await this.certificates.listCertificates(learnerId)
    return Promise.all(certificates.map((c) => this.toView(c)))
  }

  // Exercices publies seulement : un brouillon ajoute plus tard ne retire pas un certificat delivre.
  private async hasCompleted(learnerId: string, trackId: number): Promise<boolean> {
    const chapters = await this.tracks.listChapters(trackId)
    const required = (
      await Promise.all(chapters.map((c) => this.exercises.listExercises(c.id)))
    ).flat()
    if (required.length === 0) {
      return false
    }
    const passed = new Set(
      (await this.progress.listProgress(learnerId))
        .filter((p) => p.firstPassedAt !== null)
        .map((p) => p.exerciseId),
    )
    return required.every((e) => passed.has(e.id))
  }

  private async toView(certificate: Certificate): Promise<CertificateView> {
    const track = (await this.tracks.listTracks()).find((t) => t.id === certificate.trackId)
    return {
      code: certificate.code,
      holderName: certificate.holderName,
      // Parcours depublie depuis : le certificat reste valable.
      track: track ? toTrackLink(track) : null,
      issuedAt: certificate.issuedAt,
    }
  }
}

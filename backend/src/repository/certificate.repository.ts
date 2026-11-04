import type { Certificate } from '../entity/certificate.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import { TRACKS } from '../content/tracks.ts'
import { InvalidHolderNameError } from './invalid-holder-name.error.ts'
import { UnknownReferenceError } from './unknown-reference.error.ts'
import type { UserRepository } from './user.repository.ts'

export interface NewCertificate {
  readonly code: string
  readonly userId: string
  readonly trackId: number
  readonly holderName: string
  readonly issuedAt: Date
}

export interface CertificateRepository {
  /**
   * Un seul certificat par apprenant et par parcours : redemande, renvoie celui deja delivre.
   * Leve InvalidHolderNameError si le nom est vide, UnknownReferenceError si l'apprenant ou le parcours n'existe pas.
   */
  issue(certificate: NewCertificate): Promise<Certificate>
  findByCode(code: string): Promise<Certificate | null>
  /** Du plus ancien au plus recent. */
  listCertificates(userId: string): Promise<readonly Certificate[]>
}

export const assertHolderName = (holderName: string): void => {
  if (holderName.trim() === '') {
    throw new InvalidHolderNameError()
  }
}

export class InMemoryCertificateRepository implements CertificateRepository {
  private readonly certificates: Certificate[] = []
  private readonly users: UserRepository
  private readonly trackIds: ReadonlySet<number>

  constructor(users: UserRepository, tracks: readonly Track[] = TRACKS) {
    this.users = users
    this.trackIds = new Set(tracks.map((t) => t.id))
  }

  async issue(certificate: NewCertificate): Promise<Certificate> {
    assertHolderName(certificate.holderName)
    if (
      (await this.users.findById(certificate.userId)) === null ||
      !this.trackIds.has(certificate.trackId)
    ) {
      throw new UnknownReferenceError(
        `Apprenant ou parcours introuvable : ${certificate.userId}, ${certificate.trackId}`,
      )
    }
    const existing = this.certificates.find(
      (c) => c.userId === certificate.userId && c.trackId === certificate.trackId,
    )
    if (existing) {
      return { ...existing }
    }
    if (this.certificates.some((c) => c.code === certificate.code)) {
      throw new Error(`Code de certificat deja attribue : ${certificate.code}`)
    }
    const issued: Certificate = { id: this.certificates.length + 1, ...certificate }
    this.certificates.push(issued)
    return { ...issued }
  }

  async findByCode(code: string): Promise<Certificate | null> {
    const found = this.certificates.find((c) => c.code === code)
    return found ? { ...found } : null
  }

  async listCertificates(userId: string): Promise<readonly Certificate[]> {
    return this.certificates
      .filter((c) => c.userId === userId)
      .toSorted((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime() || a.id - b.id)
      .map((c) => ({ ...c }))
  }
}

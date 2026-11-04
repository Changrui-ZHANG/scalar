import type { PrismaClient } from '@prisma/client'

import type { Certificate } from '../entity/certificate.entity.ts'
import { assertHolderName } from './certificate.repository.ts'
import type { CertificateRepository, NewCertificate } from './certificate.repository.ts'
import { FOREIGN_KEY_VIOLATION, isKnownError } from './prisma-errors.ts'
import { toCertificate } from './prisma.mapper.ts'
import { UnknownReferenceError } from './unknown-reference.error.ts'
import { isUuid } from './uuid.ts'

export class PrismaCertificateRepository implements CertificateRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async issue(certificate: NewCertificate): Promise<Certificate> {
    assertHolderName(certificate.holderName)
    const { userId, trackId } = certificate
    if (!isUuid(userId)) {
      throw new UnknownReferenceError(`Apprenant introuvable : ${userId}`)
    }
    try {
      const row = await this.prisma.certificate.upsert({
        where: { certificates_user_track_key: { userId, trackId } },
        create: certificate,
        update: {},
      })
      return toCertificate(row)
    } catch (error: unknown) {
      if (isKnownError(error, FOREIGN_KEY_VIOLATION)) {
        throw new UnknownReferenceError(
          `Apprenant ou parcours introuvable : ${userId}, ${trackId}`,
          { cause: error },
        )
      }
      throw error
    }
  }

  async findByCode(code: string): Promise<Certificate | null> {
    const row = await this.prisma.certificate.findUnique({ where: { code } })
    return row && toCertificate(row)
  }

  async listCertificates(userId: string): Promise<Certificate[]> {
    if (!isUuid(userId)) {
      return []
    }
    const rows = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toCertificate)
  }
}

import type { PrismaClient } from '@prisma/client'

import type { Certificate } from '../entity/certificate.entity.ts'
import type { CertificateRepository, NewCertificate } from './certificate.repository.ts'
import { toCertificate } from './prisma.mapper.ts'

export class PrismaCertificateRepository implements CertificateRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async issue(certificate: NewCertificate): Promise<Certificate> {
    const { userId, trackId } = certificate
    const row = await this.prisma.certificate.upsert({
      where: { certificates_user_track_key: { userId, trackId } },
      create: certificate,
      update: {},
    })
    return toCertificate(row)
  }

  async findByCode(code: string): Promise<Certificate | null> {
    const row = await this.prisma.certificate.findUnique({ where: { code } })
    return row && toCertificate(row)
  }

  async listCertificates(userId: string): Promise<Certificate[]> {
    const rows = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
    })
    return rows.map(toCertificate)
  }
}

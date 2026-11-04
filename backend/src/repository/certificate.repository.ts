import type { Certificate } from '../entity/certificate.entity.ts'

export interface NewCertificate {
  readonly code: string
  readonly userId: string
  readonly trackId: number
  readonly holderName: string
  readonly issuedAt: Date
}

export interface CertificateRepository {
  /** Un seul certificat par apprenant et par parcours : redemande, renvoie celui deja delivre. */
  issue(certificate: NewCertificate): Promise<Certificate>
  findByCode(code: string): Promise<Certificate | null>
  /** Du plus ancien au plus recent. */
  listCertificates(userId: string): Promise<readonly Certificate[]>
}

export class InMemoryCertificateRepository implements CertificateRepository {
  private readonly certificates: Certificate[] = []

  async issue(certificate: NewCertificate): Promise<Certificate> {
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

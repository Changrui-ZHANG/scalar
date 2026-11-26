import type { TrackRef } from '@scalar/shared/api'

// Certificat de fin de parcours (POST /learners/:id/certificates, GET /certificates/:code).
export interface Certificate {
  readonly code: string // 10 caractères, dans l'adresse de vérification
  readonly holderName: string
  readonly track: TrackRef | null // null si le parcours a été retiré depuis
  readonly issuedAt: string
}

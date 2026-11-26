import type { Certificate } from '~/types/certificate'
import { apiFetch } from './api'

/** Délivre le certificat d'un parcours terminé ; un certificat déjà délivré est renvoyé tel quel. */
export function issueCertificate(
  learnerId: string,
  track: string,
  holderName: string,
): Promise<Certificate> {
  return apiFetch<Certificate>(`/learners/${encodeURIComponent(learnerId)}/certificates`, {
    method: 'POST',
    body: { track, holderName },
  })
}

/** Vérification publique d'un certificat par son code. */
export function fetchCertificate(code: string): Promise<Certificate> {
  return apiFetch<Certificate>(`/certificates/${encodeURIComponent(code)}`)
}

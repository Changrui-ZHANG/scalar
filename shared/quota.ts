import { PLAFOND_QUOTA_SANDBOX, type Plafond } from './limites.ts'

// Contrat du module `quota`, module minimal construit avec cette story
// (AD-14) plutot que dans une story separee — voir le Spec Change Log de
// spec-2-4. Les bornes viennent de `limites.ts`, jamais recopiees ici : c'est
// le meme plafond que le compteur applique a l'ecriture (patron de
// `exercise.ts:1-7`).

// Seule operation soumise a quota dans le perimetre minimal de cette story :
// l'execution en sandbox declenchee par une Soumission. D'autres operations
// rejoindront cette liste au fil des stories qui les introduisent.
export const QUOTA_OPERATIONS = ['executionSandbox'] as const

export type QuotaOperation = (typeof QUOTA_OPERATIONS)[number]

export const PLAFONDS_QUOTA: Readonly<Record<QuotaOperation, Plafond>> = {
  executionSandbox: PLAFOND_QUOTA_SANDBOX,
}

// Forme du contrat de reservation (AD-14). Une reservation accordee porte la
// periode qui l'a accueillie — c'est la cle dont `release` a besoin pour
// rendre exactement le credit qu'elle a consomme. Une reservation refusee ne
// porte pas de periode : rien n'y a ete consomme, il n'y a rien a liberer ;
// elle porte a la place ce qu'il faut pour construire `QUOTA_DEPASSE`.
export type QuotaReservation =
  | { readonly granted: true; readonly period: number }
  | { readonly granted: false; readonly maximum: number; readonly resetAt: Date }

// Debut de la fenetre glissante qui contient `instant`, alignee sur les
// multiples de `windowMs` depuis l'epoque. Deux appels dans la meme fenetre
// rendent le meme bucket, ce qui est precisement ce qui permet a l'index
// unique de faire converger deux reservations concurrentes sur un seul
// document.
export function periodStart(instant: Date, windowMs: number): number {
  return Math.floor(instant.getTime() / windowMs) * windowMs
}

// Instant ou la fenetre ouverte par `bucket` se termine — l'instant de
// reinitialisation servi dans `QUOTA_DEPASSE`.
export function periodEnd(bucket: number, windowMs: number): Date {
  return new Date(bucket + windowMs)
}

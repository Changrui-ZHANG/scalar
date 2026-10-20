export type IsoDateTime = string // ISO 8601 UTC : '2026-10-18T09:12:00.000Z'
export type IsoDate = string // 'YYYY-MM-DD', jour à Europe/Paris
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export interface ApiSuccess<T> {
  readonly success: true
  readonly data: T // null pour une suppression et POST /events
  readonly error: null
}

// API publique (et 429 partout) : message en français, prêt à afficher
export interface ApiPublicError {
  readonly success: false
  readonly data: null
  readonly error: string
}
export type ApiPublicResponse<T> = ApiSuccess<T> | ApiPublicError

export type AdminErrorCode =
  | 'validation' // 400
  | 'forbidden_origin' // 403
  | 'not_found' // 404
  | 'slug_taken' // 409, de 'slug_taken' à 'content_changed'
  | 'slug_locked'
  | 'slug_reserved'
  | 'publish_blocked'
  | 'delete_forbidden'
  | 'language_locked'
  | 'exercise_not_allowed'
  | 'prerequisite_cycle'
  | 'check_required'
  | 'check_failed'
  | 'check_incomplete'
  | 'check_outdated'
  | 'content_changed' // P2003 : « Le contenu a changé : rechargez la page. » (specs-backend.md § 5.2)
  | 'payload_too_large' // 413
  | 'unsupported_media_type' // 415
  | 'internal' // 500
  | 'engine_unavailable' // 503
// 429 : pas de code, enveloppe publique (limiteurs des routes publiques seulement)

export type ErrorFields = Readonly<Record<string, string>> // chemin → message : 'testCases.2.arguments'

export interface SolutionCheckCase {
  readonly caseIndex: number
  readonly passed: boolean
  readonly actual: JsonValue | null
}

export interface VerificationCheckRef {
  readonly label: string
  readonly passed: boolean
  readonly detail: string | null
  readonly caseIndex: number | null
  readonly actual: JsonValue | null
}

export interface SolutionCheckResult {
  readonly status: 'passed' | 'failed'
  readonly solutionCheckedAt: IsoDateTime
  readonly starterAlreadyPasses: boolean
  readonly checks: readonly [VerificationCheckRef, VerificationCheckRef]
  readonly cases: readonly SolutionCheckCase[]
}

export type ApiAdminError =
  | {
      readonly code: 'check_failed'
      readonly message: string
      readonly fields?: ErrorFields
      readonly details: SolutionCheckResult
    }
  | {
      readonly code: Exclude<AdminErrorCode, 'check_failed'>
      readonly message: string
      readonly fields?: ErrorFields
    }

export interface ApiAdminFailure {
  readonly success: false
  readonly data: null
  readonly error: ApiAdminError
}
export type ApiAdminResponse<T> = ApiSuccess<T> | ApiAdminFailure

import type { Response } from 'express'
import type { ApiPublicError, ApiSuccess } from '@scalar/shared/api'

import { contentUnavailable } from './errors.ts'

export function ok<T>(res: Response, data: T): void {
  const payload: ApiSuccess<T> = { success: true, data, error: null }
  res.json(payload)
}

export function fail(res: Response, status: number, error: string): void {
  const payload: ApiPublicError = { success: false, data: null, error }
  res.status(status).json(payload)
}

export function notFound(res: Response, error: string): void {
  fail(res, 404, error)
}

export function badRequest(res: Response, error: string): void {
  fail(res, 400, error)
}

export async function respond<T>(
  res: Response,
  notFoundMessage: string,
  load: () => Promise<T | null>,
): Promise<void> {
  try {
    const data = await load()
    if (data === null) {
      notFound(res, notFoundMessage)
      return
    }
    ok(res, data)
  } catch (error: unknown) {
    contentUnavailable(res, error)
  }
}

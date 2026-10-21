import { z } from 'zod'
import { MAX_HIGHLIGHT_BLOCKS, MAX_HIGHLIGHT_BYTES } from '@scalar/shared/limits'
import type { HighlightResponse } from '../../types/highlight'
import { highlightBlocks } from '../utils/highlighter'

const highlightBlockSchema = z.object({
  code: z.string(),
  language: z.string().nullable(),
})

const highlightRequestSchema = z.object({
  blocks: z.array(highlightBlockSchema).min(1).max(MAX_HIGHLIGHT_BLOCKS),
})

export default defineEventHandler(async (event): Promise<HighlightResponse> => {
  const rawBody = await readRawBody(event)
  if (!rawBody || Buffer.byteLength(rawBody, 'utf-8') > MAX_HIGHLIGHT_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Corps de requête invalide ou trop volumineux',
    })
  }

  let json: unknown
  try {
    json = JSON.parse(rawBody)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'JSON invalide',
    })
  }

  const parsed = highlightRequestSchema.safeParse(json)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Corps de requête invalide',
      data: parsed.error.issues,
    })
  }

  return highlightBlocks(parsed.data.blocks)
})

import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})

export default defineEventHandler(async (event) => {
  const table = getRouterParam(event, 'table')
  if (!table) throw createError({ statusCode: 400, statusMessage: 'Table manquante' })
  const { page, pageSize } = await getValidatedQuery(event, querySchema.parse)
  return { page, pageSize, ...(await readRows(table, page, pageSize)) }
})

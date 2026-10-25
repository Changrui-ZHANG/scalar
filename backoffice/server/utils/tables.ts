import { escapeIdentifier } from 'pg'

export interface TableSummary {
  name: string
  rowCount: number
}

export interface Column {
  name: string
  type: string
  nullable: boolean
}

// Tables internes de Prisma : sans intérêt pour vérifier le contenu.
const HIDDEN_TABLES = new Set(['_prisma_migrations'])

export async function listTables(): Promise<TableSummary[]> {
  const { rows } = await useDb().query<{ name: string }>(
    `SELECT table_name AS name
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  )
  const names = rows.map((row) => row.name).filter((name) => !HIDDEN_TABLES.has(name))
  return Promise.all(
    names.map(async (name) => {
      const count = await useDb().query<{ count: string }>(
        `SELECT count(*) AS count FROM public.${escapeIdentifier(name)}`,
      )
      return { name, rowCount: Number(count.rows[0]?.count ?? 0) }
    }),
  )
}

export async function listColumns(table: string): Promise<Column[]> {
  const { rows } = await useDb().query<{ name: string; type: string; nullable: string }>(
    `SELECT column_name AS name, udt_name AS type, is_nullable AS nullable
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  )
  return rows.map((row) => ({ name: row.name, type: row.type, nullable: row.nullable === 'YES' }))
}

/**
 * Lit une page de lignes. Le nom de table n'arrive jamais tel quel dans la
 * requête : il doit figurer dans le catalogue, puis il est échappé.
 */
export async function readRows(table: string, page: number, pageSize: number) {
  const columns = await listColumns(table)
  if (columns.length === 0 || HIDDEN_TABLES.has(table)) {
    throw createError({ statusCode: 404, statusMessage: `Table inconnue : ${table}` })
  }
  // `id` est la clé de toutes les tables du schéma ; à défaut, la première colonne.
  const orderBy = columns.some((c) => c.name === 'id') ? 'id' : columns[0]!.name
  const identifier = `public.${escapeIdentifier(table)}`
  const [rows, count] = await Promise.all([
    useDb().query(
      `SELECT * FROM ${identifier} ORDER BY ${escapeIdentifier(orderBy)} LIMIT $1 OFFSET $2`,
      [pageSize, (page - 1) * pageSize],
    ),
    useDb().query<{ count: string }>(`SELECT count(*) AS count FROM ${identifier}`),
  ])
  return {
    columns,
    rows: rows.rows as Record<string, unknown>[],
    total: Number(count.rows[0]?.count ?? 0),
  }
}

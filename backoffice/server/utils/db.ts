import pg from 'pg'

let pool: pg.Pool | undefined

// Le backoffice ne fait que consulter : chaque transaction est ouverte en
// lecture seule côté PostgreSQL, qui refuse alors toute écriture.
export function useDb(): pg.Pool {
  pool ??= new pg.Pool({
    connectionString: useRuntimeConfig().databaseUrl,
    options: '-c default_transaction_read_only=on -c statement_timeout=5000',
    max: 5,
  })
  return pool
}

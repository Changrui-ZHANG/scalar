// Répond 200 seulement si la base est joignable : sert au HEALTHCHECK de l'image.
export default defineEventHandler(async () => {
  await useDb().query('SELECT 1')
  return { status: 'ok' }
})

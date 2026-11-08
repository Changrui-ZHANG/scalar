/**
 * Parcours et chapitre designes par l'URL. Une page par identifiant : `app.vue`
 * remonte la page quand l'URL change, la lecture a la creation suffit donc.
 */

function notFound(what: string): never {
  throw createError({ statusCode: 404, statusMessage: `${what} introuvable`, fatal: true })
}

export async function useRouteTrack(): Promise<Track> {
  const route = useRoute()
  const store = useContentStore()
  return (await store.findTrack(Number(route.params.trackId))) ?? notFound('Parcours')
}

/** L'API ne trouve un chapitre que sous son parcours : /parcours/2/chapitres/1 n'existe pas. */
export async function useRouteChapter(track: Track): Promise<Chapter> {
  const route = useRoute()
  const store = useContentStore()
  return (await store.findChapter(track.id, Number(route.params.chapterId))) ?? notFound('Chapitre')
}

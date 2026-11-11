/**
 * Parcours, chapitre et exercice designes par l'URL. Une page par identifiant : `app.vue`
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

/** L'exercice de l'URL dans la suite des exercices du parcours, et ses voisins dans cette suite. */
export async function useRoutePreviewExercise(track: Track): Promise<{
  exercise: Exercise
  previous: Exercise | undefined
  next: Exercise | undefined
}> {
  const route = useRoute()
  const store = useContentStore()
  const sequence = (await store.loadOutline(track.id)).flatMap(({ exercises }) => exercises)
  const index = sequence.findIndex(({ id }) => id === Number(route.params.exerciseId))
  const exercise = sequence[index] ?? notFound('Exercice')
  return { exercise, previous: sequence[index - 1], next: sequence[index + 1] }
}

export async function useRouteExercise(chapter: Chapter): Promise<Exercise> {
  const route = useRoute()
  const store = useContentStore()
  const exercise = await store.findExercise(Number(route.params.exerciseId))
  // L'API trouve un exercice par son seul id : l'URL d'un autre chapitre doit rester un 404.
  return exercise?.chapterId === chapter.id ? exercise : notFound('Exercice')
}

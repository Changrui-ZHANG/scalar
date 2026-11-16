/**
 * Parcours, chapitre, lecon et exercice designes par l'URL. Une page par identifiant : `app.vue`
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

interface PreviewNeighbours {
  readonly previous: PreviewStep | undefined
  readonly next: PreviewStep | undefined
}

/** L'etape de l'URL dans la suite des etapes du parcours, et ses voisines dans cette suite. */
async function routePreviewStep(track: Track, kind: PreviewStep['kind'], param: string) {
  const route = useRoute()
  const store = useContentStore()
  const steps = previewSteps(await store.loadOutline(track.id))
  const id = Number(route.params[param])
  const index = steps.findIndex((s) => s.kind === kind && s.item.id === id)
  return { step: steps[index], previous: steps[index - 1], next: steps[index + 1] }
}

export async function useRoutePreviewExercise(
  track: Track,
): Promise<PreviewNeighbours & { exercise: Exercise }> {
  const { step, previous, next } = await routePreviewStep(track, 'exercise', 'exerciseId')
  return step?.kind === 'exercise'
    ? { exercise: step.item, previous, next }
    : notFound('Exercice')
}

export async function useRoutePreviewLesson(
  track: Track,
): Promise<PreviewNeighbours & { lesson: Lesson }> {
  const { step, previous, next } = await routePreviewStep(track, 'lesson', 'lessonId')
  return step?.kind === 'lesson' ? { lesson: step.item, previous, next } : notFound('Leçon')
}

export async function useRouteLesson(chapter: Chapter): Promise<Lesson> {
  const route = useRoute()
  const store = useContentStore()
  const lesson = await store.findLesson(Number(route.params.lessonId))
  // L'API trouve une lecon par son seul id : l'URL d'un autre chapitre doit rester un 404.
  return lesson?.chapterId === chapter.id ? lesson : notFound('Leçon')
}

export async function useRouteExercise(chapter: Chapter): Promise<Exercise> {
  const route = useRoute()
  const store = useContentStore()
  const exercise = await store.findExercise(Number(route.params.exerciseId))
  // L'API trouve un exercice par son seul id : l'URL d'un autre chapitre doit rester un 404.
  return exercise?.chapterId === chapter.id ? exercise : notFound('Exercice')
}

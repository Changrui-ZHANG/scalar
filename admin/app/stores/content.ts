/** Contenu du backoffice : chaque page recharge depuis l'API ce qu'elle affiche. */

function required<T>(result: ApiResult<T>): T {
  if (!result.ok) {
    throw createError({
      statusCode: result.status ?? 503,
      statusMessage: result.message,
      fatal: true,
    })
  }
  return result.data
}

const orNull = <T>(result: ApiResult<T>): T | null =>
  !result.ok && result.status === 404 ? null : required(result)

export const useContentStore = defineStore('content', () => {
  const api = useApi()
  const tracks = ref<readonly Track[]>([])
  const chapters = ref<readonly Chapter[]>([])
  const exercises = ref<readonly Exercise[]>([])

  async function loadTracks(): Promise<void> {
    tracks.value = required(await api<Track[]>('/admin/tracks'))
  }

  async function loadChapters(trackId: number): Promise<void> {
    chapters.value = required(await api<Chapter[]>(`/admin/tracks/${trackId}/chapters`))
  }

  async function loadExercises(chapterId: number): Promise<void> {
    exercises.value = required(await api<Exercise[]>(`/admin/chapters/${chapterId}/exercises`))
  }

  /** Chapitres et exercices du parcours, brouillons compris, dans l'ordre de l'API. */
  async function loadOutline(trackId: number): Promise<readonly OutlineChapter[]> {
    const list = required(await api<Chapter[]>(`/admin/tracks/${trackId}/chapters`))
    return Promise.all(
      list.map(async (chapter) => ({
        chapter,
        exercises: required(await api<Exercise[]>(`/admin/chapters/${chapter.id}/exercises`)),
      })),
    )
  }

  const tryExercise = (id: number, code: string): Promise<ApiResult<Verification>> =>
    api<Verification>(`/admin/exercises/${id}/verifications`, { method: 'POST', body: { code } })

  const findTrack = async (id: number): Promise<Track | null> =>
    orNull(await api<Track>(`/admin/tracks/${id}`))

  const findChapter = async (trackId: number, id: number): Promise<Chapter | null> =>
    orNull(await api<Chapter>(`/admin/tracks/${trackId}/chapters/${id}`))

  const findExercise = async (id: number): Promise<Exercise | null> =>
    orNull(await api<Exercise>(`/admin/exercises/${id}`))

  // L'API cree toujours en brouillon et refuse un `status` a la creation.
  async function createTrack({ status: _, ...fields }: TrackInput): Promise<SaveResult<Track>> {
    return toSaveResult(await api<Track>('/admin/tracks', { method: 'POST', body: fields }))
  }

  async function updateTrack(id: number, input: TrackInput): Promise<SaveResult<Track>> {
    return toSaveResult(await api<Track>(`/admin/tracks/${id}`, { method: 'PATCH', body: input }))
  }

  async function createChapter(
    trackId: number,
    { status: _, ...fields }: ChapterInput,
  ): Promise<SaveResult<Chapter>> {
    return toSaveResult(
      await api<Chapter>(`/admin/tracks/${trackId}/chapters`, { method: 'POST', body: fields }),
    )
  }

  async function updateChapter(
    trackId: number,
    id: number,
    input: ChapterInput,
  ): Promise<SaveResult<Chapter>> {
    return toSaveResult(
      await api<Chapter>(`/admin/tracks/${trackId}/chapters/${id}`, {
        method: 'PATCH',
        body: input,
      }),
    )
  }

  async function createExercise(
    chapterId: number,
    input: ExerciseInput,
  ): Promise<SaveResult<Exercise>> {
    const { status: _, ...fields } = toExerciseData(input)
    return toSaveResult(
      await api<Exercise>(`/admin/chapters/${chapterId}/exercises`, {
        method: 'POST',
        body: fields,
      }),
    )
  }

  async function updateExercise(id: number, input: ExerciseInput): Promise<SaveResult<Exercise>> {
    return toSaveResult(
      await api<Exercise>(`/admin/exercises/${id}`, {
        method: 'PATCH',
        body: toExerciseData(input),
      }),
    )
  }

  async function setExerciseStatus(
    id: number,
    status: ContentStatus,
  ): Promise<SaveResult<Exercise>> {
    return toSaveResult(
      await api<Exercise>(`/admin/exercises/${id}`, { method: 'PATCH', body: { status } }),
    )
  }

  const checkSolution = (id: number): Promise<ApiResult<SolutionCheck>> =>
    api<SolutionCheck>(`/admin/exercises/${id}/solution-check`, { method: 'POST' })

  return {
    tracks,
    chapters,
    exercises,
    loadTracks,
    loadChapters,
    loadExercises,
    loadOutline,
    tryExercise,
    findTrack,
    findChapter,
    findExercise,
    createTrack,
    updateTrack,
    createChapter,
    updateChapter,
    createExercise,
    updateExercise,
    setExerciseStatus,
    checkSolution,
  }
})

// Sans cela, une modification du store en developpement laisse l'ancienne
// version en place jusqu'au prochain rechargement complet de la page.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useContentStore, import.meta.hot))
}

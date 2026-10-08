/**
 * Contenu du backoffice, en memoire : une Map par table simule la base.
 * Les donnees repartent du jeu initial a chaque rechargement de la page.
 */
// Map en memoire ; remplacer par les routes /api/v1/admin/* (Pinia
// Colada) une fois la migration vers `steps` faite. Les pages ne changent pas.
import { SEED_CHAPTERS, SEED_EXERCISES, SEED_LANGUAGES } from './content.seed'

const byPosition = <T extends { readonly position: number }>(a: T, b: T) => a.position - b.position
const toMap = <T extends { readonly id: number }>(rows: readonly T[]) =>
  new Map(rows.map((r) => [r.id, r]))
const nextIdAfter = (rows: readonly { readonly id: number }[]) =>
  Math.max(0, ...rows.map((r) => r.id)) + 1

export const useContentStore = defineStore('content', () => {
  const languages = ref<ReadonlyMap<number, Language>>(toMap(SEED_LANGUAGES))
  const chapters = ref<ReadonlyMap<number, Chapter>>(toMap(SEED_CHAPTERS))
  const exercises = ref<ReadonlyMap<number, Exercise>>(toMap(SEED_EXERCISES))
  const nextId = {
    language: nextIdAfter(SEED_LANGUAGES),
    chapter: nextIdAfter(SEED_CHAPTERS),
    exercise: nextIdAfter(SEED_EXERCISES),
  }

  const languageList = computed(() => [...languages.value.values()].toSorted(byPosition))
  const chaptersOf = (languageId: number): Chapter[] =>
    [...chapters.value.values()].filter((c) => c.languageId === languageId).toSorted(byPosition)
  const exercisesOf = (chapterId: number): Exercise[] =>
    [...exercises.value.values()].filter((e) => e.chapterId === chapterId).toSorted(byPosition)

  function createLanguage(input: LanguageInput): SaveResult<Language> {
    const result = append(languageList.value, input, nextId.language)
    if (result.ok) {
      nextId.language += 1
      languages.value = new Map(languages.value).set(result.item.id, result.item)
    }
    return result
  }

  function createChapter(languageId: number, input: ChapterInput): SaveResult<Chapter> {
    const result = append(chaptersOf(languageId), { ...input, languageId }, nextId.chapter)
    if (result.ok) {
      nextId.chapter += 1
      chapters.value = new Map(chapters.value).set(result.item.id, result.item)
    }
    return result
  }

  function createExercise(chapterId: number, input: ExerciseInput): SaveResult<Exercise> {
    const data = { ...toExerciseData(input), chapterId }
    const result = append(exercisesOf(chapterId), data, nextId.exercise)
    if (result.ok) {
      nextId.exercise += 1
      exercises.value = new Map(exercises.value).set(result.item.id, result.item)
    }
    return result
  }

  // Les pages d'edition ont deja verifie l'existence via useRouteRecord :
  // un id inconnu ici est une erreur de programmation.
  function existing<T>(table: ReadonlyMap<number, T>, id: number): T {
    const row = table.get(id)
    if (!row) {
      throw new Error(`Element ${id} introuvable dans la base simulée.`)
    }
    return row
  }

  function updateLanguage(id: number, input: LanguageInput): SaveResult<Language> {
    const result = replace(languageList.value, existing(languages.value, id), input)
    if (result.ok) {
      languages.value = new Map(languages.value).set(id, result.item)
    }
    return result
  }

  function updateChapter(id: number, input: ChapterInput): SaveResult<Chapter> {
    const current = existing(chapters.value, id)
    const result = replace(chaptersOf(current.languageId), current, input)
    if (result.ok) {
      chapters.value = new Map(chapters.value).set(id, result.item)
    }
    return result
  }

  function updateExercise(id: number, input: ExerciseInput): SaveResult<Exercise> {
    const current = existing(exercises.value, id)
    const result = replace(exercisesOf(current.chapterId), current, toExerciseData(input))
    if (result.ok) {
      exercises.value = new Map(exercises.value).set(id, result.item)
    }
    return result
  }

  return {
    languages,
    chapters,
    exercises,
    languageList,
    chaptersOf,
    exercisesOf,
    createLanguage,
    createChapter,
    createExercise,
    updateLanguage,
    updateChapter,
    updateExercise,
  }
})

// Sans cela, une modification du store en developpement laisse l'ancienne
// version en place jusqu'au prochain rechargement complet de la page.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useContentStore, import.meta.hot))
}

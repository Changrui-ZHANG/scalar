/**
 * Langage et chapitre designes par l'URL. Une page par identifiant : `app.vue`
 * remonte la page quand l'URL change, la lecture a la creation suffit donc.
 */

function notFound(what: string): never {
  throw createError({ statusCode: 404, statusMessage: `${what} introuvable`, fatal: true })
}

export function useRouteLanguage(): Language {
  const route = useRoute()
  return useContentStore().languages.get(Number(route.params.languageId)) ?? notFound('Langage')
}

/** Le chapitre doit appartenir au langage de l'URL : /langages/2/chapitres/1 n'existe pas. */
export function useRouteChapter(language: Language): Chapter {
  const route = useRoute()
  const chapter = useContentStore().chapters.get(Number(route.params.chapterId))
  return chapter?.languageId === language.id ? chapter : notFound('Chapitre')
}

export function useRouteExercise(chapter: Chapter): Exercise {
  const route = useRoute()
  const exercise = useContentStore().exercises.get(Number(route.params.exerciseId))
  return exercise?.chapterId === chapter.id ? exercise : notFound('Exercice')
}

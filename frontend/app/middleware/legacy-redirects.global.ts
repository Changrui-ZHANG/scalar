import { fetchTrack } from '~/services/tracks'
import { toPageError } from '~/utils/pageError'

export default defineNuxtRouteMiddleware(async (to) => {
  const path = to.path.replace(/\/+$/, '') // Sans slash final

  // 1. /connaissance
  if (path === '/connaissance') {
    return navigateTo('/parcours', { redirectCode: 301 })
  }

  // 2. /connaissance/...
  if (path.startsWith('/connaissance/')) {
    const parts = path.split('/').filter(Boolean)
    // /connaissance/:track
    if (parts.length === 2) {
      return navigateTo(`/parcours/${parts[1]}`, { redirectCode: 301 })
    }
    // /connaissance/:track/:lesson
    if (parts.length === 3) {
      const trackSlug = parts[1] ?? ''
      const lessonSlug = parts[2] ?? ''
      try {
        const trackView = await fetchTrack(trackSlug)
        const chapter = trackView.chapters.find((c) =>
          c.lessons.some((l) => l.slug === lessonSlug),
        )
        if (chapter) {
          return navigateTo(`/parcours/${trackSlug}/${chapter.slug}/lecon/${lessonSlug}`, {
            redirectCode: 301,
          })
        }
        throw createError({ statusCode: 404, statusMessage: 'Leçon introuvable', fatal: true })
      } catch (err) {
        showError(toPageError(err))
        return
      }
    }
    // toute autre adresse sous /connaissance -> /parcours
    return navigateTo('/parcours', { redirectCode: 301 })
  }

  // 3. /parcours/:track/lecon/:lesson -> /parcours/:track/:chapter/lecon/:lesson
  if (path.startsWith('/parcours/')) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 4 && parts[2] === 'lecon') {
      const trackSlug = parts[1] ?? ''
      const lessonSlug = parts[3] ?? ''
      try {
        const trackView = await fetchTrack(trackSlug)
        const chapter = trackView.chapters.find((c) =>
          c.lessons.some((l) => l.slug === lessonSlug),
        )
        if (chapter) {
          return navigateTo(`/parcours/${trackSlug}/${chapter.slug}/lecon/${lessonSlug}`, {
            redirectCode: 301,
          })
        }
        throw createError({ statusCode: 404, statusMessage: 'Leçon introuvable', fatal: true })
      } catch (err) {
        showError(toPageError(err))
        return
      }
    }

    // 4. /parcours/:track/:chapter -> /parcours/:track#:chapter (uniquement si exactement 2 segments sous /parcours et 2ème ≠ lecon)
    if (parts.length === 3 && parts[2] !== 'index') {
      const trackSlug = parts[1]
      const chapterSlug = parts[2]
      return navigateTo(`/parcours/${trackSlug}#${chapterSlug}`, { redirectCode: 301 })
    }
  }
})

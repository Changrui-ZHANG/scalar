// Adresses du sitemap (specs-site.md § 13) : accueil, liste des parcours, pages légales,
// puis chaque parcours, leçon et exercice publié, lus dans l'API publique.
// API injoignable : erreur 503, aucune adresse inventée.
import type { ApiSuccess, TrackSummary, TrackView } from '@scalar/shared/api'
import type { SitemapUrlInput } from '#sitemap/types'

export default defineSitemapEventHandler(async () => {
  const apiBase = useRuntimeConfig().apiInternalBase

  const urls: SitemapUrlInput[] = [
    { loc: '/' },
    { loc: '/parcours' },
    { loc: '/mentions-legales' },
    { loc: '/confidentialite' },
  ]

  let tracks: readonly TrackSummary[]
  try {
    const response = await $fetch<ApiSuccess<readonly TrackSummary[]>>(`${apiBase}/tracks`)
    tracks = response.data
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Contenu momentanément indisponible' })
  }

  for (const track of tracks) {
    urls.push({ loc: `/parcours/${track.slug}` })

    let view: TrackView
    try {
      const response = await $fetch<ApiSuccess<TrackView>>(`${apiBase}/tracks/${track.slug}`)
      view = response.data
    } catch {
      throw createError({ statusCode: 503, statusMessage: 'Contenu momentanément indisponible' })
    }

    for (const chapter of view.chapters) {
      for (const lesson of chapter.lessons) {
        urls.push({ loc: `/parcours/${track.slug}/${chapter.slug}/lecon/${lesson.slug}` })
      }
      for (const exercise of chapter.exercises) {
        urls.push({ loc: `/parcours/${track.slug}/${chapter.slug}/${exercise.slug}` })
      }
    }
  }

  return urls
})

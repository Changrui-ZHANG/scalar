// Référencement d'une leçon ou d'un exercice (specs-site.md § 13) : titre, description,
// Open Graph (usePageSeo), puis un « Article » et son fil d'Ariane
// Parcours → parcours → chapitre → page.
import { usePageSeo } from './usePageSeo'

export interface EpisodeSeoOptions {
  readonly title: string
  readonly description: string
  readonly trackName: string
  readonly trackSlug: string
  readonly chapterTitle: string
  readonly chapterSlug: string
  readonly dateModified: string | null // lastReviewedAt d'une leçon, sinon null
}

export function useEpisodeSeo(options: EpisodeSeoOptions): void {
  usePageSeo({
    title: [options.title, options.chapterTitle, options.trackName],
    description: options.description,
    type: 'article',
  })

  const article: Record<string, string> = {
    headline: options.title,
    description: options.description,
  }
  if (options.dateModified) {
    article.dateModified = options.dateModified
  }

  useSchemaOrg([
    defineArticle(article),
    defineBreadcrumb({
      itemListElement: [
        { name: 'Parcours', item: '/parcours' },
        { name: options.trackName, item: `/parcours/${options.trackSlug}` },
        {
          name: options.chapterTitle,
          item: `/parcours/${options.trackSlug}#${options.chapterSlug}`,
        },
        { name: options.title },
      ],
    }),
  ])
}

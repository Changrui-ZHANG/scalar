import { pageTitle } from '~/utils/seo'

export interface PageSeoOptions {
  readonly title: readonly string[]
  readonly description: string
  readonly type: 'website' | 'article'
}

export function usePageSeo(opts: PageSeoOptions): void {
  const fullTitle = pageTitle(opts.title)

  useSeoMeta({
    title: fullTitle,
    description: opts.description,
    ogTitle: fullTitle,
    ogDescription: opts.description,
    ogType: opts.type,
    twitterCard: 'summary',
    twitterTitle: fullTitle,
    twitterDescription: opts.description,
  })
}

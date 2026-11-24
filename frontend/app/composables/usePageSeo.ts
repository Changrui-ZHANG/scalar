// Titre, description, Open Graph et URL canonique d'une page (specs-site.md § 13).
import { pageTitle } from '~/utils/seo'

export interface PageSeoOptions {
  readonly title: readonly string[] // du plus précis au plus général ; « — Scalar » est ajouté
  readonly description: string
  readonly type: 'website' | 'article'
}

export function usePageSeo(options: PageSeoOptions): void {
  const route = useRoute()
  const siteUrl = useSiteConfig().url

  const title = pageTitle(options.title)
  // URL canonique : l'adresse de la page, sans paramètres ni ancre, en absolu.
  const canonicalUrl = `${siteUrl}${route.path}`
  // Une seule image de partage pour tout le site (public/og.png, 1 200 × 630).
  const imageUrl = `${siteUrl}/og.png`

  useSeoMeta({
    title,
    description: options.description,
    ogTitle: title,
    ogDescription: options.description,
    ogType: options.type,
    ogLocale: 'fr_FR',
    ogUrl: canonicalUrl,
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
  })

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl }],
  })
}

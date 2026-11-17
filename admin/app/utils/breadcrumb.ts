export interface Crumb {
  readonly label: string
  readonly icon?: string
  readonly to?: string
}

interface Trail {
  readonly track?: Pick<Track, 'id' | 'name'>
  readonly chapter?: Pick<Chapter, 'id' | 'title'>
  /** Niveaux sous le chapitre (ou le parcours) : apercu, exercice, « Modifier »… */
  readonly extra?: readonly Crumb[]
}

/** Parcours › parcours › chapitre › … : chaque niveau mene a sa page, sauf la page courante. */
export function breadcrumb({ track, chapter, extra = [] }: Trail): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Parcours', icon: 'i-lucide-route', to: '/parcours' }]
  if (track) {
    crumbs.push({ label: track.name, to: `/parcours/${track.id}` })
    if (chapter) {
      crumbs.push({ label: chapter.title, to: `/parcours/${track.id}/chapitres/${chapter.id}` })
    }
  }
  crumbs.push(...extra)
  const { to: _, ...current } = crumbs.at(-1)!
  return [...crumbs.slice(0, -1), current]
}

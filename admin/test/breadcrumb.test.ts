import { describe, expect, it } from 'vitest'

import { breadcrumb } from '../app/utils/breadcrumb'

const TRACK = { id: 1, name: 'JavaScript' }
const CHAPTER = { id: 2, title: 'Les boucles' }

describe('fil d’Ariane', () => {
  it('liste des parcours : un seul niveau, la page courante, sans lien', () => {
    expect(breadcrumb({})).toEqual([{ label: 'Parcours', icon: 'i-lucide-route' }])
  })

  it('page d’un parcours : retour à la liste, le parcours en page courante', () => {
    expect(breadcrumb({ track: TRACK })).toEqual([
      { label: 'Parcours', icon: 'i-lucide-route', to: '/parcours' },
      { label: 'JavaScript' },
    ])
  })

  it('page d’un chapitre : la liste et le parcours en liens', () => {
    expect(breadcrumb({ track: TRACK, chapter: CHAPTER })).toEqual([
      { label: 'Parcours', icon: 'i-lucide-route', to: '/parcours' },
      { label: 'JavaScript', to: '/parcours/1' },
      { label: 'Les boucles' },
    ])
  })

  it('page sous un chapitre : chaque niveau en lien, puis la page courante', () => {
    expect(breadcrumb({ track: TRACK, chapter: CHAPTER, extra: [{ label: 'Somme' }] })).toEqual([
      { label: 'Parcours', icon: 'i-lucide-route', to: '/parcours' },
      { label: 'JavaScript', to: '/parcours/1' },
      { label: 'Les boucles', to: '/parcours/1/chapitres/2' },
      { label: 'Somme' },
    ])
  })

  it('niveaux intermédiaires en plus : seul le dernier perd son lien', () => {
    const items = breadcrumb({
      track: TRACK,
      extra: [
        { label: 'Tester', to: '/parcours/1/apercu' },
        { label: 'Somme', to: '/x' },
      ],
    })

    expect(items.slice(-2)).toEqual([
      { label: 'Tester', to: '/parcours/1/apercu' },
      { label: 'Somme' },
    ])
  })
})

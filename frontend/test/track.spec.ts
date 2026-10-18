import { describe, expect, it } from 'vitest'
import type { TrackView } from '../app/utils/api'
import {
  buildEpisodes,
  firstIncomplete,
  nextEpisode,
  normalize,
  progressOf,
  relatedLesson,
  searchEpisodes,
  trackStatus,
} from '../app/utils/track'

const TRACK: TrackView = {
  track: { slug: 'javascript', name: 'JavaScript', programmingLanguage: 'javascript' },
  chapters: [
    {
      slug: 'premiers-pas',
      title: 'Premiers pas',
      level: 'beginner',
      number: 1,
      lessons: [{ slug: 'variables', title: 'Variables et valeurs', summary: '`const` et `let`' }],
      exercises: [
        { slug: 'bonjour', title: 'Bonjour, JavaScript', instructions: 'Affiche bonjour.' },
        { slug: 'variable', title: 'Une première variable', instructions: 'Déclare age.' },
      ],
    },
    {
      slug: 'conditions',
      title: 'Conditions',
      level: 'beginner',
      number: 2,
      lessons: [{ slug: 'decision', title: 'Prendre une décision', summary: '`if` et `else`' }],
      exercises: [
        { slug: 'positif', title: 'Positif ou négatif', instructions: 'Compare à zéro.' },
        { slug: 'pair', title: 'Pair ou impair', instructions: 'Utilise `%`.' },
      ],
    },
  ],
}

describe('buildEpisodes', () => {
  it('numérote en continu à travers les chapitres, leçon d’abord', () => {
    const episodes = buildEpisodes(TRACK, [])
    expect(episodes.map((e) => [e.number, e.type, e.title])).toEqual([
      [1, 'lesson', 'Variables et valeurs'],
      [2, 'exercise', 'Bonjour, JavaScript'],
      [3, 'exercise', 'Une première variable'],
      [4, 'lesson', 'Prendre une décision'],
      [5, 'exercise', 'Positif ou négatif'],
      [6, 'exercise', 'Pair ou impair'],
    ])
    expect(episodes[3]?.route).toBe('/parcours/javascript/conditions/lecon/decision')
    expect(episodes[4]?.route).toBe('/parcours/javascript/conditions/positif')
  })

  it('le premier épisode non terminé devient « à suivre »', () => {
    const done = [
      'lesson:premiers-pas:variables',
      'exercise:premiers-pas:bonjour',
      'lesson:conditions:decision',
    ]
    const episodes = buildEpisodes(TRACK, done)

    expect(episodes.map((e) => e.status)).toEqual([
      'completed',
      'completed',
      'current',
      'completed',
      'todo',
      'todo',
    ])
    expect(firstIncomplete(episodes)?.title).toBe('Une première variable')
    expect(progressOf(episodes)).toEqual({ done: 3, total: 6, percent: 50 })
  })
})

describe('clés de leçon', () => {
  it('distinguent deux leçons de même slug dans deux chapitres', () => {
    const twice: TrackView = {
      track: { slug: 'conception', name: 'Conception', programmingLanguage: null },
      chapters: ['bases', 'avance'].map((slug, i) => ({
        slug,
        title: slug,
        level: 'beginner',
        number: i + 1,
        lessons: [{ slug: 'introduction', title: 'Introduction', summary: '' }],
        exercises: [],
      })),
    }
    const episodes = buildEpisodes(twice, ['lesson:bases:introduction'])

    expect(episodes.map((e) => e.status)).toEqual(['completed', 'current'])
    expect(episodes[1]?.route).toBe('/parcours/conception/avance/lecon/introduction')
  })
})

describe('statut d’un parcours', () => {
  it('non commencé, en cours, terminé', () => {
    const none = buildEpisodes(TRACK, [])
    const all = buildEpisodes(
      TRACK,
      none.map((e) => e.key),
    )

    expect(trackStatus(none, false)).toBe('todo')
    expect(trackStatus(none, true)).toBe('active')
    expect(trackStatus(all, true)).toBe('completed')
  })
})

describe('navigation entre épisodes', () => {
  const episodes = buildEpisodes(TRACK, [])

  it('après le dernier exercice d’un chapitre vient la leçon du suivant', () => {
    expect(nextEpisode(episodes, 'exercise:premiers-pas:variable')?.title).toBe(
      'Prendre une décision',
    )
    expect(nextEpisode(episodes, 'exercise:conditions:pair')).toBeNull()
  })

  it('l’aide d’un exercice vient de la leçon de son chapitre, jamais d’un autre', () => {
    expect(relatedLesson(episodes, 'exercise:conditions:pair')?.title).toBe('Prendre une décision')
    expect(relatedLesson(episodes, 'exercise:premiers-pas:bonjour')?.title).toBe(
      'Variables et valeurs',
    )
  })
})

describe('recherche', () => {
  const episodes = buildEpisodes(TRACK, [])

  it('trouve tous les épisodes d’un chapitre par son titre, sans accents ni casse', () => {
    expect(searchEpisodes(episodes, normalize('CONDITIONS')).map((e) => e.number)).toEqual([
      4, 5, 6,
    ])
    expect(searchEpisodes(episodes, normalize('decision')).map((e) => e.number)).toEqual([4])
  })

  it('cherche aussi dans les résumés et les consignes', () => {
    expect(searchEpisodes(episodes, normalize('zéro')).map((e) => e.title)).toEqual([
      'Positif ou négatif',
    ])
    expect(searchEpisodes(episodes, '')).toEqual([])
  })
})

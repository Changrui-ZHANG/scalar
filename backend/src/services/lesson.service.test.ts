import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { InMemoryExerciseRepository } from '../repositories/exercise.repository.ts'
import { InMemoryLanguageRepository } from '../repositories/language.repository.ts'
import { InMemoryLessonRepository } from '../repositories/lesson.repository.ts'
import { LessonService } from './lesson.service.ts'

// Donnees fictives reelles : deux langages, une categorie transverse, un brouillon.
const service = new LessonService(
  new InMemoryLanguageRepository(),
  new InMemoryLessonRepository(),
  new InMemoryExerciseRepository(),
)

describe('LessonService.getSection', () => {
  it('groupe les leçons d’un langage par catégorie propre, sans les transverses', async () => {
    const section = await service.getSection('javascript')

    assert.equal(section?.kind, 'language')
    assert.equal(section?.label, 'JavaScript')
    assert.deepEqual(
      section?.groups.map((g) => [g.slug, g.lessons.length]),
      [
        ['debutant', 7],
        ['intermediaire', 2],
        ['avance', 2],
        ['ecosysteme', 2],
      ],
    )
  })

  it('numérote les leçons dans leur catégorie, brouillon exclu', async () => {
    const section = await service.getSection('javascript')
    const intermediaire = section?.groups.find((g) => g.slug === 'intermediaire')

    assert.deepEqual(
      intermediaire?.lessons.map((l) => [l.slug, l.number]),
      [
        ['fonctions-flechees-et-closures', 1],
        ['async-await', 2],
      ],
    )
  })

  it('sert une catégorie transverse comme une section à part entière', async () => {
    const section = await service.getSection('conception')

    assert.equal(section?.kind, 'category')
    assert.deepEqual(
      section?.groups[0]?.lessons.map((l) => l.slug),
      ['nommage-et-lisibilite', 'architecture-mvc'],
    )
  })

  it('refuse une catégorie propre à un langage, ou un slug inconnu', async () => {
    assert.equal(await service.getSection('debutant'), null)
    assert.equal(await service.getSection('python'), null)
  })
})

describe('LessonService.listTransverseSections', () => {
  it('liste les catégories valables pour tous les langages', async () => {
    const sections = await service.listTransverseSections()
    assert.deepEqual(
      sections.map((s) => s.slug),
      ['conception'],
    )
  })
})

describe('LessonService.getLesson', () => {
  it('situe la leçon dans sa catégorie', async () => {
    const lesson = await service.getLesson('javascript', 'classes')

    assert.equal(lesson?.number, 7)
    assert.deepEqual(lesson?.category, { slug: 'debutant', label: 'Débutant', size: 7 })
    assert.deepEqual(lesson?.section, { kind: 'language', slug: 'javascript', label: 'JavaScript' })
  })

  it('enchaîne les catégories : après le dernier cours débutant vient l’intermédiaire', async () => {
    const lesson = await service.getLesson('javascript', 'classes')

    assert.equal(lesson?.previous?.slug, 'try-catch')
    assert.equal(lesson?.next?.slug, 'fonctions-flechees-et-closures')
  })

  it('saute le brouillon dans l’enchaînement', async () => {
    const lesson = await service.getLesson('javascript', 'async-await')
    assert.equal(lesson?.next?.slug, 'prototypes')
  })

  it('garde les leçons transverses dans leur propre suite', async () => {
    const lesson = await service.getLesson('conception', 'architecture-mvc')

    assert.equal(lesson?.section.kind, 'category')
    assert.equal(lesson?.previous?.slug, 'nommage-et-lisibilite')
    assert.equal(lesson?.next, null)
  })

  it('liste les chapitres où s’exercer, dans l’ordre du parcours', async () => {
    const lesson = await service.getLesson('javascript', 'fonctions')

    assert.deepEqual(lesson?.chapters, [
      { languageSlug: 'javascript', slug: 'variables', title: 'Variables', number: 1 },
      { languageSlug: 'javascript', slug: 'conditions', title: 'Conditions', number: 2 },
      { languageSlug: 'javascript', slug: 'boucles', title: 'Boucles', number: 3 },
    ])
  })

  it('expose la date de relecture en ISO', async () => {
    const lesson = await service.getLesson('javascript', 'dotenv')
    assert.equal(lesson?.reviewedAt, '2026-09-01T00:00:00.000Z')
  })

  it('renvoie null pour un brouillon, ou hors de sa section', async () => {
    assert.equal(await service.getLesson('javascript', 'modules'), null)
    assert.equal(await service.getLesson('javascript', 'architecture-mvc'), null)
    assert.equal(await service.getLesson('typescript', 'boucles'), null)
    assert.equal(await service.getLesson('conception', 'boucles'), null)
  })
})

describe('LessonService.listLessonsForChapter', () => {
  it('renvoie les leçons à relire, avec leur section et leur numéro', async () => {
    const lessons = await service.listLessonsForChapter('javascript', 'boucles')

    assert.deepEqual(
      lessons?.map((l) => [l.section.slug, l.slug, l.number]),
      [
        ['javascript', 'boucles', 4],
        ['javascript', 'fonctions', 5],
      ],
    )
  })

  it('renvoie null pour un chapitre d’un autre langage', async () => {
    assert.equal(await service.listLessonsForChapter('typescript', 'boucles'), null)
  })
})

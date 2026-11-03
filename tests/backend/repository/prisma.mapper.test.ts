import { Prisma } from '@prisma/client'
import type {
  Chapter as ChapterRow,
  Exercise as ExerciseRow,
  ExerciseTestCase as ExerciseTestCaseRow,
  Lesson as LessonRow,
  Track as TrackRow,
} from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { chapter, exercise, lesson, testCase, track } from '../service/content.fixtures.ts'
import {
  toChapter,
  toExercise,
  toExerciseTestCase,
  toLesson,
  toTrack,
} from '../../../backend/src/repository/prisma.mapper.ts'

const columns = (fields: Record<string, string>): string[] => Object.values(fields).toSorted()
const keys = (entity: object): string[] => Object.keys(entity).toSorted()

const trackRow: TrackRow = track(1, 'javascript', 1, { prerequisiteTrackId: 2 })
const chapterRow: ChapterRow = chapter(3, 1, 'boucles', 'beginner', 1)
const lessonRow: LessonRow = lesson(4, 3, 'for', 1, { lastReviewedAt: new Date('2026-10-01') })
const exerciseRow: ExerciseRow = exercise(5, 3, 'fizzbuzz', 1)
const testCaseRow = (values: Partial<ExerciseTestCaseRow> = {}): ExerciseTestCaseRow => ({
  ...(testCase(6, 5, 1) as ExerciseTestCaseRow),
  ...values,
})

describe('conversion ligne Prisma → entité', () => {
  it.each([
    ['Track', toTrack(trackRow), Prisma.TrackScalarFieldEnum],
    ['Chapter', toChapter(chapterRow), Prisma.ChapterScalarFieldEnum],
    ['Lesson', toLesson(lessonRow), Prisma.LessonScalarFieldEnum],
    ['Exercise', toExercise(exerciseRow), Prisma.ExerciseScalarFieldEnum],
    ['ExerciseTestCase', toExerciseTestCase(testCaseRow()), Prisma.ExerciseTestCaseScalarFieldEnum],
  ])('%s reprend chaque colonne de la table, et rien d’autre', (_, entity, fields) => {
    expect(keys(entity)).toEqual(columns(fields))
  })

  it.each([
    ['Track', toTrack(trackRow), trackRow],
    ['Chapter', toChapter(chapterRow), chapterRow],
    ['Lesson', toLesson(lessonRow), lessonRow],
    ['Exercise', toExercise(exerciseRow), exerciseRow],
  ])('%s garde chaque valeur telle quelle', (_, entity, row) => {
    expect(entity).toEqual(row)
  })

  it('laisse de côté les relations chargées avec la ligne', () => {
    const row = { ...trackRow, chapters: [chapterRow], prerequisiteTrack: null }

    expect(toTrack(row)).not.toHaveProperty('chapters')
    expect(toTrack(row)).not.toHaveProperty('prerequisiteTrack')
  })

  it('garde les valeurs nulles', () => {
    const row = { ...trackRow, programmingLanguage: null, prerequisiteTrackId: null }

    expect(toTrack(row)).toMatchObject({ programmingLanguage: null, prerequisiteTrackId: null })
  })
})

describe('conversion d’un cas de test', () => {
  it('garde les arguments et le résultat JSON, même imbriqués ou nuls', () => {
    const row = testCaseRow({
      arguments: [[1, 2], { a: null }, 'x'],
      expectedResult: null,
      description: null,
    })

    expect(toExerciseTestCase(row)).toMatchObject({
      arguments: [[1, 2], { a: null }, 'x'],
      expectedResult: null,
      description: null,
    })
  })

  it('accepte une liste d’arguments vide', () => {
    expect(toExerciseTestCase(testCaseRow({ arguments: [] })).arguments).toEqual([])
  })

  it.each([
    ['un objet', { a: 1 }],
    ['un nombre', 42],
    ['une chaîne', '[1, 2]'],
    ['null', null],
  ])('refuse des arguments qui sont %s', (_, value) => {
    expect(() => toExerciseTestCase(testCaseRow({ id: 9, arguments: value }))).toThrow(
      /Cas de test 9/,
    )
  })
})

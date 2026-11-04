import { Prisma } from '@prisma/client'
import type {
  Certificate as CertificateRow,
  Chapter as ChapterRow,
  Exercise as ExerciseRow,
  ExerciseProgress as ExerciseProgressRow,
  ExerciseTestCase as ExerciseTestCaseRow,
  Lesson as LessonRow,
  Track as TrackRow,
  User as UserRow,
} from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { chapter, exercise, lesson, testCase, track } from '../content.fixtures.ts'
import {
  toCertificate,
  toChapter,
  toExercise,
  toExerciseProgress,
  toExerciseTestCase,
  toLesson,
  toTrack,
  toUser,
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
const userRow: UserRow = {
  id: '6f1c2a3b-0000-4000-8000-000000000001',
  email: 'ada@example.org',
  passwordHash: '$argon2id$hash',
  tokenVersion: 2,
  createdAt: new Date('2026-11-01'),
}
const progressRow: ExerciseProgressRow = {
  userId: userRow.id,
  exerciseId: 5,
  attempts: 3,
  firstPassedAt: new Date('2026-11-02'),
  lastAttemptAt: new Date('2026-11-03'),
}
const certificateRow: CertificateRow = {
  id: 7,
  code: 'ABC123',
  userId: userRow.id,
  trackId: 1,
  holderName: 'Ada Lovelace',
  issuedAt: new Date('2026-11-04'),
}

describe('conversion ligne Prisma → entité', () => {
  it.each([
    ['Track', toTrack(trackRow), Prisma.TrackScalarFieldEnum],
    ['Chapter', toChapter(chapterRow), Prisma.ChapterScalarFieldEnum],
    ['Lesson', toLesson(lessonRow), Prisma.LessonScalarFieldEnum],
    ['Exercise', toExercise(exerciseRow), Prisma.ExerciseScalarFieldEnum],
    ['ExerciseTestCase', toExerciseTestCase(testCaseRow()), Prisma.ExerciseTestCaseScalarFieldEnum],
    ['User', toUser(userRow), Prisma.UserScalarFieldEnum],
    ['ExerciseProgress', toExerciseProgress(progressRow), Prisma.ExerciseProgressScalarFieldEnum],
    ['Certificate', toCertificate(certificateRow), Prisma.CertificateScalarFieldEnum],
  ])('%s reprend chaque colonne de la table, et rien d’autre', (_, entity, fields) => {
    expect(keys(entity)).toEqual(columns(fields))
  })

  it.each([
    ['Track', toTrack(trackRow), trackRow],
    ['Chapter', toChapter(chapterRow), chapterRow],
    ['Lesson', toLesson(lessonRow), lessonRow],
    ['Exercise', toExercise(exerciseRow), exerciseRow],
    ['User', toUser(userRow), userRow],
    ['ExerciseProgress', toExerciseProgress(progressRow), progressRow],
    ['Certificate', toCertificate(certificateRow), certificateRow],
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
    expect(toExerciseProgress({ ...progressRow, firstPassedAt: null }).firstPassedAt).toBeNull()
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

import { Prisma } from '@prisma/client'
import type {
  Certificate as CertificateRow,
  Chapter as ChapterRow,
  Exercise as ExerciseRow,
  ExerciseProgress as ExerciseProgressRow,
  ExerciseTestCase as ExerciseTestCaseRow,
  Lesson as LessonRow,
  Placement as PlacementRow,
  QuestionnaireTestCase as QuestionnaireTestCaseRow,
  Track as TrackRow,
  User as UserRow,
} from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { chapter, exercise, lesson, testCase, track } from '../content.fixtures.ts'
import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_TEST_CASES,
} from '../../../backend/src/content/questionnaire.ts'
import {
  toCertificate,
  toChapter,
  toExercise,
  toExerciseProgress,
  toExerciseTestCase,
  toLesson,
  toPlacement,
  toQuestionnaireOption,
  toQuestionnaireQuestion,
  toQuestionnaireTestCase,
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

const questionRow = QUESTIONNAIRE_QUESTIONS[0]!
const optionRow = QUESTIONNAIRE_OPTIONS[0]!
const questionnaireCaseRow = QUESTIONNAIRE_TEST_CASES[0]! as QuestionnaireTestCaseRow
const placementRow: PlacementRow = {
  id: 8,
  score: 74,
  level: 'intermediate',
  trackId: 1,
  declared: 1 / 3,
  knowledge: 1,
  practical: 0.9,
  userId: null,
  createdAt: new Date('2026-11-06'),
}

// [nom, entite convertie, ligne d'origine, colonnes de la table]
const MAPPINGS: ReadonlyArray<readonly [string, object, object, Record<string, string>]> = [
  ['Track', toTrack(trackRow), trackRow, Prisma.TrackScalarFieldEnum],
  ['Chapter', toChapter(chapterRow), chapterRow, Prisma.ChapterScalarFieldEnum],
  ['Lesson', toLesson(lessonRow), lessonRow, Prisma.LessonScalarFieldEnum],
  ['Exercise', toExercise(exerciseRow), exerciseRow, Prisma.ExerciseScalarFieldEnum],
  [
    'ExerciseTestCase',
    toExerciseTestCase(testCaseRow()),
    testCaseRow(),
    Prisma.ExerciseTestCaseScalarFieldEnum,
  ],
  ['User', toUser(userRow), userRow, Prisma.UserScalarFieldEnum],
  [
    'ExerciseProgress',
    toExerciseProgress(progressRow),
    progressRow,
    Prisma.ExerciseProgressScalarFieldEnum,
  ],
  ['Certificate', toCertificate(certificateRow), certificateRow, Prisma.CertificateScalarFieldEnum],
  [
    'QuestionnaireQuestion',
    toQuestionnaireQuestion(questionRow),
    questionRow,
    Prisma.QuestionnaireQuestionScalarFieldEnum,
  ],
  [
    'QuestionnaireOption',
    toQuestionnaireOption(optionRow),
    optionRow,
    Prisma.QuestionnaireOptionScalarFieldEnum,
  ],
  [
    'QuestionnaireTestCase',
    toQuestionnaireTestCase(questionnaireCaseRow),
    questionnaireCaseRow,
    Prisma.QuestionnaireTestCaseScalarFieldEnum,
  ],
  ['Placement', toPlacement(placementRow), placementRow, Prisma.PlacementScalarFieldEnum],
]

describe('conversion ligne Prisma → entité', () => {
  it('chaque entité reprend chaque colonne de sa table, et rien d’autre', () => {
    for (const [name, entity, , fields] of MAPPINGS) {
      expect(keys(entity), name).toEqual(columns(fields))
    }
  })

  it('chaque entité garde chaque valeur telle quelle', () => {
    for (const [name, entity, row] of MAPPINGS) {
      expect(entity, name).toEqual(row)
    }
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
  it('garde les arguments et le résultat JSON, même imbriqués, nuls ou vides', () => {
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
    expect(toExerciseTestCase(testCaseRow({ arguments: [] })).arguments).toEqual([])
  })

  it('refuse une ligne que l’entité ne peut pas représenter', () => {
    for (const value of [{ a: 1 }, 42, '[1, 2]', null]) {
      expect(() => toExerciseTestCase(testCaseRow({ id: 9, arguments: value }))).toThrow(
        /Cas de test 9/,
      )
      expect(() =>
        toQuestionnaireTestCase({ ...questionnaireCaseRow, id: 9, arguments: value }),
      ).toThrow(/Cas de test 9/)
    }
    expect(() => toPlacement({ ...placementRow, level: 'ecosystem' })).toThrow(/ecosystem/)
  })
})

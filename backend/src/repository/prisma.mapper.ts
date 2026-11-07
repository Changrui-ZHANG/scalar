import type {
  Certificate as CertificateRow,
  Chapter as ChapterRow,
  Exercise as ExerciseRow,
  ExerciseProgress as ExerciseProgressRow,
  ExerciseTestCase as ExerciseTestCaseRow,
  Lesson as LessonRow,
  Placement as PlacementRow,
  QuestionnaireOption as QuestionnaireOptionRow,
  QuestionnaireQuestion as QuestionnaireQuestionRow,
  QuestionnaireTestCase as QuestionnaireTestCaseRow,
  Track as TrackRow,
  User as UserRow,
} from '@prisma/client'
import type { JsonValue } from '@scalar/shared/api'

import type { Certificate } from '../entity/certificate.entity.ts'
import type { Chapter } from '../entity/chapter.entity.ts'
import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseProgress } from '../entity/exercise-progress.entity.ts'
import type { ExerciseTestCase } from '../entity/exercise-test-case.entity.ts'
import type { Lesson } from '../entity/lesson.entity.ts'
import type { Placement, PlacementLevel } from '../entity/placement.entity.ts'
import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { QuestionnaireTestCase } from '../entity/questionnaire-test-case.entity.ts'
import type { Track } from '../entity/track.entity.ts'
import type { User } from '../entity/user.entity.ts'

export function toTrack(row: TrackRow): Track {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    position: row.position,
    programmingLanguage: row.programmingLanguage,
    prerequisiteTrackId: row.prerequisiteTrackId,
    status: row.status,
    firstPublishedAt: row.firstPublishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toChapter(row: ChapterRow): Chapter {
  return {
    id: row.id,
    trackId: row.trackId,
    slug: row.slug,
    level: row.level,
    position: row.position,
    title: row.title,
    summary: row.summary,
    status: row.status,
    firstPublishedAt: row.firstPublishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    chapterId: row.chapterId,
    slug: row.slug,
    position: row.position,
    title: row.title,
    summary: row.summary,
    body: row.body,
    lastReviewedAt: row.lastReviewedAt,
    status: row.status,
    firstPublishedAt: row.firstPublishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    chapterId: row.chapterId,
    slug: row.slug,
    position: row.position,
    title: row.title,
    instructions: row.instructions,
    functionName: row.functionName,
    starterCode: row.starterCode,
    solutionCode: row.solutionCode,
    hints: row.hints,
    solutionCheckStatus: row.solutionCheckStatus,
    solutionCheckedAt: row.solutionCheckedAt,
    status: row.status,
    firstPublishedAt: row.firstPublishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toExerciseTestCase(row: ExerciseTestCaseRow): ExerciseTestCase {
  if (!Array.isArray(row.arguments)) {
    throw new TypeError(`Cas de test ${row.id} : arguments n'est pas un tableau JSON`)
  }
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    position: row.position,
    arguments: row.arguments as readonly JsonValue[],
    expectedResult: row.expectedResult as JsonValue,
    isHidden: row.isHidden,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    tokenVersion: row.tokenVersion,
    role: row.role,
    createdAt: row.createdAt,
  }
}

export function toExerciseProgress(row: ExerciseProgressRow): ExerciseProgress {
  return {
    userId: row.userId,
    exerciseId: row.exerciseId,
    attempts: row.attempts,
    firstPassedAt: row.firstPassedAt,
    lastAttemptAt: row.lastAttemptAt,
  }
}

export function toCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    code: row.code,
    userId: row.userId,
    trackId: row.trackId,
    holderName: row.holderName,
    issuedAt: row.issuedAt,
  }
}

export function toQuestionnaireQuestion(row: QuestionnaireQuestionRow): QuestionnaireQuestion {
  return {
    id: row.id,
    position: row.position,
    kind: row.kind,
    title: row.title,
    description: row.description,
    weight: row.weight,
    functionName: row.functionName,
    starterCode: row.starterCode,
    solutionCode: row.solutionCode,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toQuestionnaireOption(row: QuestionnaireOptionRow): QuestionnaireOption {
  return {
    id: row.id,
    questionId: row.questionId,
    position: row.position,
    label: row.label,
    score: row.score,
    trackSlug: row.trackSlug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toQuestionnaireTestCase(row: QuestionnaireTestCaseRow): QuestionnaireTestCase {
  if (!Array.isArray(row.arguments)) {
    throw new TypeError(`Cas de test ${row.id} : arguments n'est pas un tableau JSON`)
  }
  return {
    id: row.id,
    questionId: row.questionId,
    position: row.position,
    arguments: row.arguments as readonly JsonValue[],
    expectedResult: row.expectedResult as JsonValue,
    isHidden: row.isHidden,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toPlacement(row: PlacementRow): Placement {
  if (row.level === 'ecosystem') {
    throw new TypeError(`Positionnement ${row.id} : niveau ecosystem impossible`)
  }
  return {
    id: row.id,
    score: row.score,
    level: row.level satisfies PlacementLevel,
    trackId: row.trackId,
    declared: row.declared,
    knowledge: row.knowledge,
    practical: row.practical,
    userId: row.userId,
    createdAt: row.createdAt,
  }
}

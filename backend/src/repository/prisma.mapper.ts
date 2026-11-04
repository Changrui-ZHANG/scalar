import type {
  Chapter as ChapterRow,
  Exercise as ExerciseRow,
  ExerciseTestCase as ExerciseTestCaseRow,
  Lesson as LessonRow,
  Track as TrackRow,
} from '@prisma/client'
import type { JsonValue } from '@scalar/shared/api'

import type { Chapter } from '../entity/chapter.entity.ts'
import type { Exercise } from '../entity/exercise.entity.ts'
import type { ExerciseTestCase } from '../entity/exercise-test-case.entity.ts'
import type { Lesson } from '../entity/lesson.entity.ts'
import type { Track } from '../entity/track.entity.ts'

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

/**
 * Fabriques de contenu pour les tests des services : chaque champ a une valeur
 * par defaut publiee, `extra` ne precise que ce que le test examine.
 */

import type {
  Chapter,
  ChapterLevel,
  Exercise,
  ExerciseTestCase,
  Lesson,
  Track,
} from '../db/schema.ts'

const DATE = new Date('2026-09-28T00:00:00Z')
const published = { status: 'published', firstPublishedAt: DATE } as const
const stamps = { createdAt: DATE, updatedAt: DATE }

export function track(id: number, slug: string, position: number, extra: Partial<Track> = {}): Track {
  return {
    id,
    slug,
    name: slug.toUpperCase(),
    position,
    summary: `Résumé ${slug}`,
    programmingLanguage: 'javascript',
    prerequisiteTrackId: null,
    ...published,
    ...stamps,
    ...extra,
  }
}

export function chapter(
  id: number,
  trackId: number,
  slug: string,
  level: ChapterLevel,
  position: number,
  extra: Partial<Chapter> = {},
): Chapter {
  return {
    id,
    trackId,
    slug,
    level,
    position,
    title: `Chapitre ${slug}`,
    summary: 'résumé',
    ...published,
    ...stamps,
    ...extra,
  }
}

export function lesson(
  id: number,
  chapterId: number,
  slug: string,
  position: number,
  extra: Partial<Lesson> = {},
): Lesson {
  return {
    id,
    chapterId,
    slug,
    position,
    title: `Leçon ${slug}`,
    summary: `Résumé ${slug}`,
    body: 'cours',
    lastReviewedAt: null,
    ...published,
    ...stamps,
    ...extra,
  }
}

export function exercise(
  id: number,
  chapterId: number,
  slug: string,
  position: number,
  extra: Partial<Exercise> = {},
): Exercise {
  return {
    id,
    chapterId,
    slug,
    position,
    title: `Exercice ${slug}`,
    instructions: 'consigne',
    functionName: 'f',
    starterCode: 'function f() {}',
    solutionCode: 'function f() { return 42 }',
    hints: [],
    solutionCheckStatus: 'passed',
    solutionCheckedAt: DATE,
    ...published,
    ...stamps,
    ...extra,
  }
}

export function testCase(
  id: number,
  exerciseId: number,
  position: number,
  extra: Partial<ExerciseTestCase> = {},
): ExerciseTestCase {
  return {
    id,
    exerciseId,
    position,
    arguments: [],
    expectedResult: 42,
    isHidden: false,
    description: null,
    ...stamps,
    ...extra,
  }
}

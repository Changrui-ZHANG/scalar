import { CHAPTER_LEVELS } from '@scalar/shared/enums'
import { z } from 'zod'

import type { AdminExercise } from '../entity/admin-exercise.entity.ts'
import type { AdminContentRepository } from '../repository/admin-content.repository.ts'
import type { AdminContentService, AdminOutcome, SolutionCheck } from './admin-content.service.ts'
import { newExercise, parse, text } from './admin-content.service.ts'
import { EngineUnavailableError } from './execution.service.ts'
import type { ExerciseGenerator } from './exercise-generator.ts'

export interface GeneratedDraft {
  readonly exercise: AdminExercise
  /** Null si le moteur etait indisponible : l'admin relance la verification lui-meme. */
  readonly solutionCheck: Omit<SolutionCheck, 'exercise'> | null
}

const request = z.strictObject({
  topic: text(500),
  level: z.enum(CHAPTER_LEVELS).optional(),
})

const aiExercise = newExercise.refine((exercise) => exercise.testCases.length > 0)

function freeSlug(wanted: string, taken: ReadonlySet<string>): string {
  let slug = wanted
  for (let n = 2; taken.has(slug); n += 1) {
    slug = `${wanted}-${n}`
  }
  return slug
}

/** L'IA ne fait qu'un brouillon : seul l'admin publie, apres relecture et verification. */
export class ExerciseGenerationService {
  private readonly content: AdminContentRepository
  private readonly admin: AdminContentService
  private readonly generator: ExerciseGenerator | null

  constructor(
    content: AdminContentRepository,
    admin: AdminContentService,
    generator: ExerciseGenerator | null,
  ) {
    this.content = content
    this.admin = admin
    this.generator = generator
  }

  async generate(chapterId: number, body: unknown): Promise<AdminOutcome<GeneratedDraft>> {
    const parsed = parse(request, body)
    if (!parsed.ok) {
      return parsed.outcome
    }
    const chapter = await this.content.findChapterById(chapterId)
    if (!chapter) {
      return { status: 'not-found' }
    }
    const track = await this.content.findTrack(chapter.trackId)
    if (!track?.programmingLanguage) {
      return { status: 'no-language' }
    }
    if (!this.generator) {
      return { status: 'ai-unavailable' }
    }
    const existing = await this.content.listExercises(chapterId)
    const takenSlugs = existing.map((e) => e.slug)
    const output = await this.generator.generate({
      topic: parsed.data.topic,
      level: parsed.data.level ?? chapter.level,
      language: track.programmingLanguage,
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      takenSlugs,
    })
    const valid = aiExercise.safeParse(output)
    if (!valid.success) {
      return { status: 'ai-output-invalid' }
    }
    const created = await this.content.createExercise(chapterId, {
      ...valid.data,
      slug: freeSlug(valid.data.slug, new Set(takenSlugs)),
      generatedByAi: true,
    })
    if (created.status !== 'saved') {
      return created
    }
    return { status: 'saved', item: await this.check(created.item) }
  }

  private async check(exercise: AdminExercise): Promise<GeneratedDraft> {
    try {
      const checked = await this.admin.checkSolution(exercise.id)
      if (checked.status !== 'saved') {
        return { exercise, solutionCheck: null }
      }
      const { exercise: verified, ...solutionCheck } = checked.item
      return { exercise: verified, solutionCheck }
    } catch (error: unknown) {
      if (error instanceof EngineUnavailableError) {
        return { exercise, solutionCheck: null }
      }
      throw error
    }
  }
}

// Sortie destinee au navigateur : jamais les scores des options, ni la solution, ni les cas caches.

import { randomUUID } from 'node:crypto'

import type { ProgrammingLanguage } from '@scalar/shared/enums'
import { z } from 'zod'

import { MAX_CODE_BYTES, PROGRAMMING_LANGUAGES } from '../constants.ts'
import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { QuestionnaireRepository } from '../repository/questionnaire.repository.ts'
import type { TrackRepository } from '../repository/track.repository.ts'
import { executeCode, toJavaScript } from './execution.service.ts'
import type { TestCaseView, Verification } from './exercise.service.ts'
import type { ExerciseScore, QuestionnaireScore } from './questionnaire-scoring.service.ts'
import { scoreQuestionnaire, toExerciseScore } from './questionnaire-scoring.service.ts'
import type { TrackLink } from './track.service.ts'
import { toTrackLink } from './track.service.ts'
import { buildHarness, readVerdict } from './verification.service.ts'

export interface PublicQuestion {
  readonly id: number
  readonly position: number
  readonly kind: QuestionnaireQuestion['kind']
  readonly title: string
  readonly description: string | null
  readonly options: readonly { readonly id: number; readonly label: string }[]
  readonly functionName: string | null
  readonly starterCode: string | null
  readonly testCases: readonly TestCaseView[]
}

export interface ExerciseOutcome extends ExerciseScore {
  readonly questionId: number
  readonly title: string
  readonly passed: boolean
}

export interface QuestionnaireResult extends Omit<QuestionnaireScore, 'trackSlug'> {
  readonly track: TrackLink | null
  readonly startChapter: { readonly slug: string; readonly title: string } | null
  readonly exercises: readonly ExerciseOutcome[]
}

export type ResultsOutcome =
  | { readonly ok: true; readonly result: QuestionnaireResult }
  | { readonly ok: false; readonly error: string }

const id = z.number('Identifiant attendu.').int().positive()

export const resultsSchema = z.object({
  choices: z
    .array(z.object({ questionId: id, optionId: id }), 'Le champ « choices » doit être un tableau.')
    .max(50)
    .default([]),
  submissions: z
    .array(
      z.object({
        questionId: id,
        programmingLanguage: z.enum(PROGRAMMING_LANGUAGES).default('javascript'),
        // Vide : exercice laisse de cote, compte comme non reussi.
        code: z
          .string('Le champ « code » doit être une chaîne de caractères.')
          .refine(
            (code) => Buffer.byteLength(code, 'utf8') <= MAX_CODE_BYTES,
            `Le code soumis dépasse la limite de ${MAX_CODE_BYTES} octets.`,
          ),
      }),
      'Le champ « submissions » doit être un tableau.',
    )
    .max(10)
    .default([]),
})

export type ResultsInput = z.infer<typeof resultsSchema>

export class QuestionnaireService {
  private readonly questionnaire: QuestionnaireRepository
  private readonly tracks: TrackRepository

  constructor(questionnaire: QuestionnaireRepository, tracks: TrackRepository) {
    this.questionnaire = questionnaire
    this.tracks = tracks
  }

  async getQuestionnaire(): Promise<readonly PublicQuestion[]> {
    const questions = await this.questionnaire.listQuestions()
    return Promise.all(
      questions.map(async (q) => {
        const options = await this.questionnaire.listOptions(q.id)
        const testCases = await this.questionnaire.listTestCases(q.id)
        return {
          id: q.id,
          position: q.position,
          kind: q.kind,
          title: q.title,
          description: q.description,
          options: options.map((o) => ({ id: o.id, label: o.label })),
          functionName: q.functionName,
          starterCode: q.starterCode,
          testCases: testCases
            .filter((t) => !t.isHidden)
            .map((t) => ({
              arguments: t.arguments,
              expectedResult: t.expectedResult,
              description: t.description,
            })),
        }
      }),
    )
  }

  /** null si la question n'existe pas ou n'est pas un exercice. */
  async verify(
    questionId: number,
    code: string,
    programmingLanguage: ProgrammingLanguage = 'javascript',
  ): Promise<Verification | null> {
    const questions = await this.questionnaire.listQuestions()
    const question = questions.find((q) => q.id === questionId && q.kind === 'code')
    if (!question) {
      return null
    }
    return this.grade(question, code, programmingLanguage)
  }

  async submitResults(input: ResultsInput): Promise<ResultsOutcome> {
    const questions = await this.questionnaire.listQuestions()
    const options = (
      await Promise.all(questions.map((q) => this.questionnaire.listOptions(q.id)))
    ).flat()

    const invalid = this.validate(input, questions, options)
    if (invalid) {
      return { ok: false, error: invalid }
    }

    // Une a une : le moteur partage sa capacite entre tous les apprenants.
    const exercises = new Map<number, ExerciseScore>()
    const outcomes: ExerciseOutcome[] = []
    for (const question of questions.filter((q) => q.kind === 'code')) {
      const submission = input.submissions.find((s) => s.questionId === question.id)
      const verification =
        submission && submission.code.trim() !== ''
          ? await this.grade(question, submission.code, submission.programmingLanguage)
          : null
      const result = verification?.ok ? verification.result : null
      const score = result
        ? toExerciseScore(result)
        : {
            passedCases: 0,
            totalCases: (await this.questionnaire.listTestCases(question.id)).length,
          }
      if (result) {
        exercises.set(question.id, score)
      }
      outcomes.push({
        questionId: question.id,
        title: question.title,
        ...score,
        passed: result?.passed ?? false,
      })
    }

    const tracks = await this.tracks.listTracks()
    const score = scoreQuestionnaire({
      questions,
      options,
      answers: {
        choices: new Map(input.choices.map((c) => [c.questionId, c.optionId])),
        exercises,
      },
      prerequisiteOf: (slug) => {
        const track = tracks.find((t) => t.slug === slug)
        return tracks.find((t) => t.id === track?.prerequisiteTrackId)?.slug ?? null
      },
    })

    const { trackSlug, ...rest } = score
    const track = tracks.find((t) => t.slug === trackSlug) ?? null
    const chapters = track ? await this.tracks.listChapters(track.id) : []
    const start = chapters.find((c) => c.level === score.level) ?? chapters[0] ?? null
    return {
      ok: true,
      result: {
        ...rest,
        track: track ? toTrackLink(track) : null,
        startChapter: start ? { slug: start.slug, title: start.title } : null,
        exercises: outcomes,
      },
    }
  }

  private validate(
    input: ResultsInput,
    questions: readonly QuestionnaireQuestion[],
    options: readonly QuestionnaireOption[],
  ): string | null {
    const answered = [...input.choices, ...input.submissions].map((a) => a.questionId)
    const duplicate = answered.find((q, i) => answered.indexOf(q) !== i)
    if (duplicate !== undefined) {
      return `La question ${duplicate} a plusieurs réponses.`
    }
    for (const choice of input.choices) {
      const question = questions.find((q) => q.id === choice.questionId)
      if (!question || question.kind === 'code') {
        return `La question ${choice.questionId} n’attend pas de choix.`
      }
      if (!options.some((o) => o.id === choice.optionId && o.questionId === question.id)) {
        return `L’option ${choice.optionId} n’appartient pas à la question ${question.id}.`
      }
    }
    for (const submission of input.submissions) {
      if (!questions.some((q) => q.id === submission.questionId && q.kind === 'code')) {
        return `La question ${submission.questionId} n’attend pas de code.`
      }
    }
    return null
  }

  private async grade(
    question: QuestionnaireQuestion,
    code: string,
    programmingLanguage: ProgrammingLanguage,
  ): Promise<Verification> {
    // Le nom vient du contenu, jamais du navigateur : il choisirait sinon les cas contre lesquels etre corrige.
    const functionName = question.functionName ?? ''
    const converted = toJavaScript(programmingLanguage, code)
    if (!converted.ok) {
      return converted
    }
    const cases = (await this.questionnaire.listTestCases(question.id)).map((t) => ({
      arguments: t.arguments,
      expectedResult: t.expectedResult,
      description: t.description,
      isHidden: t.isHidden,
    }))
    const marker = `__scalar_${randomUUID()}__`
    const execution = await executeCode(buildHarness(converted.code, functionName, cases, marker))
    return { ok: true, result: readVerdict(execution, functionName, cases, marker) }
  }
}

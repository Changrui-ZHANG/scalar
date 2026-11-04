import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { QuestionnaireTestCase } from '../entity/questionnaire-test-case.entity.ts'
import {
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_QUESTIONS,
  QUESTIONNAIRE_TEST_CASES,
} from '../content/questionnaire.ts'

export interface QuestionnaireRepository {
  listQuestions(): Promise<readonly QuestionnaireQuestion[]>
  listOptions(questionId: number): Promise<readonly QuestionnaireOption[]>
  listTestCases(questionId: number): Promise<readonly QuestionnaireTestCase[]>
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position

export class InMemoryQuestionnaireRepository implements QuestionnaireRepository {
  private readonly questions: readonly QuestionnaireQuestion[]
  private readonly options: readonly QuestionnaireOption[]
  private readonly testCases: readonly QuestionnaireTestCase[]

  constructor(
    questions: readonly QuestionnaireQuestion[] = QUESTIONNAIRE_QUESTIONS,
    options: readonly QuestionnaireOption[] = QUESTIONNAIRE_OPTIONS,
    testCases: readonly QuestionnaireTestCase[] = QUESTIONNAIRE_TEST_CASES,
  ) {
    this.questions = questions.filter((q) => q.status === 'published')
    this.options = options
    this.testCases = testCases
  }

  async listQuestions(): Promise<readonly QuestionnaireQuestion[]> {
    return this.questions.toSorted(byPosition)
  }

  async listOptions(questionId: number): Promise<readonly QuestionnaireOption[]> {
    if (!this.isPublished(questionId)) {
      return []
    }
    return this.options.filter((o) => o.questionId === questionId).toSorted(byPosition)
  }

  async listTestCases(questionId: number): Promise<readonly QuestionnaireTestCase[]> {
    if (!this.isPublished(questionId)) {
      return []
    }
    return this.testCases.filter((t) => t.questionId === questionId).toSorted(byPosition)
  }

  private isPublished(questionId: number): boolean {
    return this.questions.some((q) => q.id === questionId)
  }
}

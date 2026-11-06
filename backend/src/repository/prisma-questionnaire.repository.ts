import type { PrismaClient } from '@prisma/client'

import { ORDER_BY_POSITION, PUBLISHED } from '../constants.ts'
import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { QuestionnaireTestCase } from '../entity/questionnaire-test-case.entity.ts'
import {
  toQuestionnaireOption,
  toQuestionnaireQuestion,
  toQuestionnaireTestCase,
} from './prisma.mapper.ts'
import type { QuestionnaireRepository } from './questionnaire.repository.ts'

export class PrismaQuestionnaireRepository implements QuestionnaireRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async listQuestions(): Promise<QuestionnaireQuestion[]> {
    const rows = await this.prisma.questionnaireQuestion.findMany({
      where: { status: PUBLISHED },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toQuestionnaireQuestion)
  }

  async listOptions(questionId: number): Promise<QuestionnaireOption[]> {
    const rows = await this.prisma.questionnaireOption.findMany({
      where: { questionId, question: { status: PUBLISHED } },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toQuestionnaireOption)
  }

  async listTestCases(questionId: number): Promise<QuestionnaireTestCase[]> {
    const rows = await this.prisma.questionnaireTestCase.findMany({
      where: { questionId, question: { status: PUBLISHED } },
      orderBy: ORDER_BY_POSITION,
    })
    return rows.map(toQuestionnaireTestCase)
  }
}

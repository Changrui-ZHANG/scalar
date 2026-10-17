import type { Questionnaire } from '../db.schema.ts'
import { MOCK_QUESTIONNAIRES } from './questionnaire.mock.ts'

/** Acces aux questionnaires de positionnement. Seuls les questionnaires publies sont servis. */
export interface QuestionnaireRepository {
  /** Liste des questionnaires publies. */
  listQuestionnaires(): Promise<readonly Questionnaire[]>
  /** Questionnaire aleatoire. */
  getRandomQuestionnaire(): Promise<Questionnaire | null>
  /** Questionnaire par ID. */
  findQuestionnaireById(id: number): Promise<Questionnaire | null>
}

// Donnees fictives en memoire ; PrismaQuestionnaireRepository pour la base.
export class InMemoryQuestionnaireRepository implements QuestionnaireRepository {
  private readonly questionnaires: readonly Questionnaire[]

  constructor(questionnaires: readonly Questionnaire[] = MOCK_QUESTIONNAIRES) {
    this.questionnaires = questionnaires.filter((q) => q.status === 'published')
  }

  async listQuestionnaires(): Promise<readonly Questionnaire[]> {
    return this.questionnaires
  }

  async getRandomQuestionnaire(): Promise<Questionnaire | null> {
    if (this.questionnaires.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * this.questionnaires.length)
    return this.questionnaires[randomIndex]
  }

  async findQuestionnaireById(id: number): Promise<Questionnaire | null> {
    return this.questionnaires.find((q) => q.id === id) ?? null
  }
}
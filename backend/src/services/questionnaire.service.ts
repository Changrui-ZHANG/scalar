import { PrismaClient } from "@prisma/client";
import type { Questionnaire, QuestionnaireQuestion } from "../db/schema.ts";

export class QuestionnaireService {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listQuestionnaires(): Promise<Questionnaire[]> {
    return this.prisma.questionnaire.findMany({
      where: { status: "published" },
      include: { questions: true }
    });
  }

  async getRandomQuestionnaire(): Promise<Questionnaire | null> {
    // D'abord compter les questionnaires publiés
    const count = await this.prisma.questionnaire.count({
      where: { status: "published" }
    });

    if (count === 0) {
      return null;
    }

    // Générer un index aléatoire
    const randomIndex = Math.floor(Math.random() * count);

    // Récupérer le questionnaire à cet index
    return this.prisma.questionnaire.findMany({
      where: { status: "published" },
      include: { questions: true },
      skip: randomIndex,
      take: 1
    }).then(questionnaires => questionnaires[0] || null);
  }

  async findQuestionnaireById(id: number): Promise<Questionnaire | null> {
    return this.prisma.questionnaire.findUnique({
      where: { id },
      include: { questions: true }
    });
  }
}
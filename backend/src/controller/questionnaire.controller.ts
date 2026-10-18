import { Router } from "express";
import type { Request, Response } from "express";
import { logger } from "../logger.ts";
import type { QuestionnaireRepository } from "../repositories/questionnaire.repository.ts";
import type { LessonService } from "../services/lesson.service.ts";
import {
  evaluateSubmission,
  resultsSchema,
  verificationSchema,
  verifyQuestionnaireCode,
  type EvaluatedQuestion,
} from "../services/questionnaire-evaluation.service.ts";
import { notFound, respond } from "./respond.ts";

const UNAVAILABLE = "Le moteur d’exécution est momentanément indisponible.";

export class QuestionnaireController {
  private readonly questionnaires: QuestionnaireRepository;
  private readonly lessons: Pick<LessonService, "getSection">;

  constructor(questionnaires: QuestionnaireRepository, lessons: Pick<LessonService, "getSection">) {
    this.questionnaires = questionnaires;
    this.lessons = lessons;
  }

  async listQuestionnaires(_req: Request, res: Response) {
    await respond(res, "Aucun questionnaire disponible.", () =>
      this.questionnaires.listQuestionnaires(),
    );
  }

  async getRandomQuestionnaire(_req: Request, res: Response) {
    await respond(res, "Questionnaire introuvable.", () =>
      this.questionnaires.getRandomQuestionnaire(),
    );
  }

  async getQuestionnaire(req: Request<{ id: string }>, res: Response) {
    await respond(res, "Questionnaire introuvable.", () =>
      this.questionnaires.findQuestionnaireById(Number(req.params.id)),
    );
  }

  /** Lance les tests unitaires d'un exercice du questionnaire. */
  async verifyCode(req: Request, res: Response) {
    const parsed = verificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Requête invalide.",
      });
      return;
    }
    try {
      const verdict = await verifyQuestionnaireCode(parsed.data.functionName, parsed.data.code);
      if (!verdict) {
        notFound(res, "Exercice inconnu.");
        return;
      }
      res.json({ success: true, data: verdict, error: null });
    } catch (error: unknown) {
      logger.error({ err: error }, "Échec de la correction d’un exercice du questionnaire");
      res.status(503).json({ success: false, data: null, error: UNAVAILABLE });
    }
  }

  /** Recorrige les exercices, puis renvoie le niveau et les cours proposes. */
  async submitQuestionnaireResults(req: Request, res: Response) {
    const parsed = resultsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Requête invalide.",
      });
      return;
    }
    const questionnaire = await this.questionnaires
      .findQuestionnaireById(parsed.data.questionnaireId)
      .catch((error: unknown) => {
        logger.error({ err: error }, "Lecture du questionnaire impossible");
        return undefined;
      });
    if (questionnaire === undefined) {
      res.status(500).json({
        success: false,
        data: null,
        error: "Le contenu est momentanément indisponible.",
      });
      return;
    }
    if (questionnaire === null) {
      notFound(res, "Questionnaire introuvable.");
      return;
    }
    try {
      const evaluation = await evaluateSubmission(
        // Le type Prisma ne porte pas la relation chargee par `include`.
        (questionnaire as unknown as { questions?: readonly EvaluatedQuestion[] }).questions ?? [],
        parsed.data,
        this.lessons,
      );
      res.json({ success: true, data: evaluation, error: null });
    } catch (error: unknown) {
      logger.error({ err: error }, "Évaluation du questionnaire impossible");
      res.status(503).json({ success: false, data: null, error: UNAVAILABLE });
    }
  }

  buildRouter() {
    const router = Router();
    router.get("/questionnaires", this.listQuestionnaires.bind(this));
    router.get("/questionnaires/random", this.getRandomQuestionnaire.bind(this));
    router.get("/questionnaires/:id", this.getQuestionnaire.bind(this));
    router.post("/questionnaire-verifications", this.verifyCode.bind(this));
    router.post("/questionnaire-results", this.submitQuestionnaireResults.bind(this));
    return router;
  }
}

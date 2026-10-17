import { Router } from "express";
import type { Request, Response } from "express";
import { QuestionnaireService } from "../services/questionnaire.service.ts";
import { respond } from "./respond.ts";

export class QuestionnaireController {
  private readonly service: QuestionnaireService;

  constructor(service: QuestionnaireService) {
    this.service = service;
  }

  async listQuestionnaires(_req: Request, res: Response) {
    await respond(res, "Aucun questionnaire disponible.", () => this.service.listQuestionnaires());
  }

  async getRandomQuestionnaire(_req: Request, res: Response) {
    await respond(res, "Questionnaire introuvable.", () => this.service.getRandomQuestionnaire());
  }

  async getQuestionnaire(req: Request<{ id: string }>, res: Response) {
    await respond(res, "Questionnaire introuvable.", () => this.service.getQuestionnaire(Number(req.params.id)));
  }

  async submitQuestionnaireResults(_req: Request, res: Response) {
    // Log the received results for network trace visibility
    console.log("Questionnaire results submitted:", _req.body);
    await respond(res, "Results received.", () => Promise.resolve({ status: "success" }));
  }

  buildRouter() {
    const router = Router();
    router.get("/questionnaires", this.listQuestionnaires.bind(this));
    router.get("/questionnaires/random", this.getRandomQuestionnaire.bind(this));
    router.get("/questionnaires/:id", this.getQuestionnaire.bind(this));
    router.post("/questionnaire-results", this.submitQuestionnaireResults.bind(this));
    return router;
  }
}
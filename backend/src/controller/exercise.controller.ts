import { Router } from "express";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../logger.ts";
import { executeCode, parseSubmission, toJavaScript } from "../services/execution.service.ts";
import { ExerciseService } from "../services/exercise.service.ts";
import { buildHarness, readVerdict } from "../services/verification.service.ts";
import { notFound, respond } from "./respond.ts";

type ChapterParams = { language: string; chapter: string };

export class ExerciseController {
  private readonly service: ExerciseService;

  constructor(service: ExerciseService) {
    this.service = service;
  }

  async listLanguages(_req: Request, res: Response) {
    await respond(res, "Aucun langage.", () => this.service.listLanguages());
  }

  async listChapters(req: Request<{ language: string }>, res: Response) {
    await respond(res, "Langage inconnu.", () => this.service.listChapters(req.params.language));
  }

  async getChapter(req: Request<ChapterParams>, res: Response) {
    const { language, chapter } = req.params;
    await respond(res, "Chapitre introuvable.", () => this.service.getChapter(language, chapter));
  }

  async getExercise(req: Request<ChapterParams & { exercise: string }>, res: Response) {
    const { language, chapter, exercise } = req.params;
    await respond(res, "Exercice introuvable.", () =>
      this.service.getExercise(language, chapter, exercise),
    );
  }

  /**
   * Corrige une soumission : le code tourne avec tous les cas de test, caches
   * compris, et le verdict detaille revient au client. Ne termine rien cote
   * serveur : la progression vit dans le navigateur.
   */
  async verifyExercise(req: Request<ChapterParams & { exercise: string }>, res: Response) {
    const parsed = parseSubmission({ code: (req.body as { code?: unknown } | undefined)?.code });
    if (!parsed.ok) {
      res.status(400).json({ success: false, data: null, error: parsed.error });
      return;
    }
    const { language, chapter, exercise } = req.params;
    const target = await this.service
      .findForVerification(language, chapter, exercise)
      .catch((error: unknown) => {
        logger.error({ err: error }, "Lecture de l’exercice à corriger impossible");
        return undefined;
      });
    if (target === undefined) {
      res.status(500).json({
        success: false,
        data: null,
        error: "Le contenu est momentanément indisponible.",
      });
      return;
    }
    if (target === null) {
      notFound(res, "Exercice introuvable.");
      return;
    }
    const converted = toJavaScript(target.runtime, parsed.submission.code);
    if (!converted.ok) {
      res.status(400).json({ success: false, data: null, error: converted.error });
      return;
    }
    const marker = `__scalar_${randomUUID()}__`;
    try {
      const execution = await executeCode(
        buildHarness(converted.code, target.functionName, target.cases, marker),
      );
      res.json({
        success: true,
        data: readVerdict(execution, target.functionName, target.cases, marker),
        error: null,
      });
    } catch (error: unknown) {
      logger.error({ err: error }, "Échec de l’appel au moteur d’exécution");
      res.status(503).json({
        success: false,
        data: null,
        error: "Le moteur d’exécution est momentanément indisponible.",
      });
    }
  }

  buildRouter() {
    const router = Router();
    router.get("/languages", this.listLanguages.bind(this));
    router.get("/languages/:language/chapters", this.listChapters.bind(this));
    router.get("/languages/:language/chapters/:chapter", this.getChapter.bind(this));
    router.get(
      "/languages/:language/chapters/:chapter/exercises/:exercise",
      this.getExercise.bind(this),
    );
    router.post(
      "/languages/:language/chapters/:chapter/exercises/:exercise/verifications",
      this.verifyExercise.bind(this),
    );
    return router;
  }
}

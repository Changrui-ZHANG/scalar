import { Router } from "express";
import type { Request, Response } from "express";
import { logger } from "../logger.ts";
import { ExerciseService, isLanguage } from "../services/exercise.service.ts";

export class ExerciseController {
  private readonly service: ExerciseService;

  constructor(service: ExerciseService) {
    this.service = service;
  }

  async listChapters(req: Request<{ language: string }>, res: Response) {
    const { language } = req.params;
    if (!isLanguage(language)) {
      notFound(res, "Langage inconnu.");
      return;
    }

    await respond(res, "Langage inconnu.", () => this.service.listChapters(language));
  }

  async getChapter(req: Request<{ slug: string }>, res: Response) {
    await respond(res, "Chapitre introuvable.", () => this.service.getChapter(req.params.slug));
  }

  async getExercise(req: Request<{ slug: string }>, res: Response) {
    await respond(res, "Exercice introuvable.", () => this.service.getExercise(req.params.slug));
  }

  buildRouter() {
    const router = Router();
    router.get("/languages/:language/chapters", this.listChapters.bind(this));
    router.get("/chapters/:slug", this.getChapter.bind(this));
    router.get("/exercises/:slug", this.getExercise.bind(this));
    return router;
  }
}

function notFound(res: Response, error: string): void {
  res.status(404).json({ success: false, data: null, error });
}

/**
 * Envoie le resultat dans l'enveloppe commune, ou un 404 s'il est `null`.
 * Le detail d'une panne reste cote serveur.
 */
async function respond<T>(
  res: Response,
  notFoundMessage: string,
  load: () => Promise<T | null>,
): Promise<void> {
  try {
    const data = await load();
    if (data === null) {
      notFound(res, notFoundMessage);
      return;
    }
    res.json({ success: true, data, error: null });
  } catch (error: unknown) {
    logger.error({ err: error }, "Lecture du parcours impossible");
    res.status(500).json({
      success: false,
      data: null,
      error: "Le parcours est momentanément indisponible.",
    });
  }
}

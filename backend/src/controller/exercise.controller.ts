import { Router } from "express";
import type { Request, Response } from "express";
import { ExerciseService } from "../services/exercise.service.ts";
import { respond } from "./respond.ts";

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

  buildRouter() {
    const router = Router();
    router.get("/languages", this.listLanguages.bind(this));
    router.get("/languages/:language/chapters", this.listChapters.bind(this));
    router.get("/languages/:language/chapters/:chapter", this.getChapter.bind(this));
    router.get(
      "/languages/:language/chapters/:chapter/exercises/:exercise",
      this.getExercise.bind(this),
    );
    return router;
  }
}

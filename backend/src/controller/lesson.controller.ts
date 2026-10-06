import { Router } from "express";
import type { Request, Response } from "express";
import { LessonService } from "../services/lesson.service.ts";
import { respond } from "./respond.ts";

export class LessonController {
  private readonly service: LessonService;

  constructor(service: LessonService) {
    this.service = service;
  }

  async listTransverseSections(_req: Request, res: Response) {
    await respond(res, "Aucune catégorie.", () => this.service.listTransverseSections());
  }

  async getSection(req: Request<{ section: string }>, res: Response) {
    await respond(res, "Section introuvable.", () => this.service.getSection(req.params.section));
  }

  async getLesson(req: Request<{ section: string; lesson: string }>, res: Response) {
    const { section, lesson } = req.params;
    await respond(res, "Cours introuvable.", () => this.service.getLesson(section, lesson));
  }

  async listLessonsForChapter(req: Request<{ language: string; chapter: string }>, res: Response) {
    const { language, chapter } = req.params;
    await respond(res, "Chapitre introuvable.", () =>
      this.service.listLessonsForChapter(language, chapter),
    );
  }

  async getTrack(req: Request<{ language: string }>, res: Response) {
    await respond(res, "Langage inconnu.", () => this.service.getTrack(req.params.language));
  }

  buildRouter() {
    const router = Router();
    // Avant `/lessons/:section` : « transverse » n'est pas un slug de section.
    router.get("/lessons/transverse", this.listTransverseSections.bind(this));
    router.get("/lessons/:section", this.getSection.bind(this));
    router.get("/lessons/:section/:lesson", this.getLesson.bind(this));
    router.get("/languages/:language/track", this.getTrack.bind(this));
    router.get(
      "/languages/:language/chapters/:chapter/lessons",
      this.listLessonsForChapter.bind(this),
    );
    return router;
  }
}

import { Router } from "express";
import type { Request, Response } from "express";
import { logger } from "../logger.ts";
import { executeCode, parseSubmission } from "../services/execution.service.ts";

export class ExecutionController {
  async executeSubmission(req: Request, res: Response) {
    // Valide avant tout appel sortant : une entree malformee ne doit jamais
    // atteindre le moteur d'execution.
    const parsed = parseSubmission(req.body);
    if (!parsed.ok) {
      res.status(400).json({ success: false, data: null, error: parsed.error });
      return;
    }

    try {
      const result = await executeCode(parsed.submission.code);
      res.json({ success: true, data: result, error: null });
    } catch (error: unknown) {
      // Le detail -- URL, statut, corps de la reponse du moteur -- reste cote
      // serveur : le client ne recoit qu'un message generique.
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
    router.post("/", this.executeSubmission.bind(this));
    return router;
  }
}
import type { Response } from "express";
import { logger } from "../logger.ts";

export function notFound(res: Response, error: string): void {
  res.status(404).json({ success: false, data: null, error });
}

/**
 * Envoie le resultat dans l'enveloppe commune, ou un 404 s'il est `null`.
 * Le detail d'une panne reste cote serveur.
 */
export async function respond<T>(
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
    logger.error({ err: error }, "Lecture du contenu impossible");
    res.status(500).json({
      success: false,
      data: null,
      error: "Le contenu est momentanément indisponible.",
    });
  }
}

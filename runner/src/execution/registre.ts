import { LANGAGES_RUNNER, type LangageRunner } from '@scalar/shared/runner.ts'

// Registre ferme (AD-3, AD-12) : le runner choisit lui-meme l'image depuis
// cette table, jamais depuis une valeur fournie par l'appelant. Une seule
// entree en v1 — le seul systeme de fichiers inscriptible est non executable,
// ce qui interdit tout langage compile nativement (AD-12).
//
// L'etiquette est mouvante ; c'est le digest qui identifie ce que le pic a
// eprouve (voir `spike/sandbox-2-1/RAPPORT.md`). Le pre-tirage par digest sur
// le VPS reste une tache de deploiement, hors de ce fichier.
const IMAGES_PAR_LANGAGE: Readonly<Record<LangageRunner, string>> = {
  javascript: 'node:24-alpine',
}

export function resoudreImage(languageId: string): string {
  if (!(LANGAGES_RUNNER as readonly string[]).includes(languageId)) {
    throw new Error(`Langage hors du registre ferme : « ${languageId} ».`)
  }

  const image = IMAGES_PAR_LANGAGE[languageId as LangageRunner]

  return image
}

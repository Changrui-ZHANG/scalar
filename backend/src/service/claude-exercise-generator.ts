import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { JsonValue } from '@scalar/shared/api'
import { z } from 'zod'

import { AiUnavailableError } from './ai-unavailable.error.ts'
import type { ExerciseBrief, ExerciseGenerator, GeneratedExercise } from './exercise-generator.ts'

// Les cas en texte JSON : une sortie structuree ne sait pas decrire « n'importe quelle valeur JSON ».
const output = z.object({
  slug: z.string(),
  title: z.string(),
  instructions: z.string(),
  functionName: z.string(),
  starterCode: z.string(),
  solutionCode: z.string(),
  hints: z.array(z.string()),
  testCases: z.array(
    z.object({
      argumentsJson: z.string(),
      expectedResultJson: z.string(),
      isHidden: z.boolean(),
      description: z.string().nullable(),
    }),
  ),
})

const SYSTEM = `Tu rédiges des exercices de programmation pour Scalar, une plateforme francophone \
d'apprentissage du code. Un exercice demande d'écrire UNE fonction pure, sans entrée/sortie \
(ni console, ni réseau, ni fichier), que des cas de test appellent avec des arguments et dont ils \
comparent le résultat (égalité profonde).

Règles :
- instructions : consigne en Markdown, en français, au tutoiement, qui nomme la fonction, ses \
paramètres et ce qu'elle renvoie, avec un exemple. Ne donne jamais la solution.
- starterCode : la signature de la fonction avec un corps vide (un commentaire au plus).
- solutionCode : une solution correcte et lisible, qui passe TOUS les cas de test.
- testCases : de 3 à 8 cas, dont au moins un cas limite (vide, zéro, négatif…). argumentsJson est \
un tableau JSON des arguments, dans l'ordre ; expectedResultJson est la valeur JSON attendue. \
Marque isHidden à true pour un ou deux cas, pour que l'apprenant ne puisse pas recopier les réponses.
- hints : de 1 à 3 indices, du plus vague au plus précis, sans donner le code.
- slug : en minuscules, mots séparés par des tirets, sans accent, absent de la liste des slugs pris.
- functionName : un identifiant en camelCase.
Adapte la difficulté au niveau demandé et reste dans le thème du chapitre.`

function prompt(brief: ExerciseBrief): string {
  return [
    `Sujet demandé : ${brief.topic}`,
    `Niveau : ${brief.level}`,
    `Langage : ${brief.language}`,
    `Chapitre : ${brief.chapterTitle} (${brief.chapterSummary})`,
    `Slugs déjà pris dans le chapitre : ${brief.takenSlugs.join(', ') || 'aucun'}`,
  ].join('\n')
}

function parseJson(text: string): { ok: true; value: JsonValue } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as JsonValue }
  } catch {
    return { ok: false }
  }
}

function toExercise({ testCases, ...rest }: z.infer<typeof output>): GeneratedExercise | null {
  const cases = []
  for (const t of testCases) {
    const args = parseJson(t.argumentsJson)
    const expected = parseJson(t.expectedResultJson)
    if (!args.ok || !expected.ok || !Array.isArray(args.value)) {
      return null
    }
    cases.push({
      arguments: args.value,
      expectedResult: expected.value,
      isHidden: t.isHidden,
      description: t.description,
    })
  }
  return { ...rest, testCases: cases }
}

export class ClaudeExerciseGenerator implements ExerciseGenerator {
  private readonly client: Anthropic
  private readonly model: string

  constructor(client: Anthropic, model: string) {
    this.client = client
    this.model = model
  }

  async generate(brief: ExerciseBrief): Promise<GeneratedExercise | null> {
    let response
    try {
      response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        // Sur un refus du modele principal, l'API rejoue la demande sur un modele de repli.
        fallbacks: 'default',
        output_config: { effort: 'high', format: zodOutputFormat(output) },
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt(brief) }],
      })
    } catch (error: unknown) {
      if (error instanceof Anthropic.APIError) {
        throw new AiUnavailableError(error)
      }
      throw error
    }
    if (response.stop_reason !== 'end_turn' || !response.parsed_output) {
      return null
    }
    return toExercise(response.parsed_output)
  }
}

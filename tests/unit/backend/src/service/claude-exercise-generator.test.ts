import Anthropic from '@anthropic-ai/sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiUnavailableError } from '../../../../../backend/src/service/ai-unavailable.error.ts'
import { ClaudeExerciseGenerator } from '../../../../../backend/src/service/claude-exercise-generator.ts'
import type { ExerciseBrief } from '../../../../../backend/src/service/exercise-generator.ts'

const BRIEF: ExerciseBrief = {
  topic: 'somme avec une boucle',
  level: 'beginner',
  language: 'typescript',
  chapterTitle: 'Les boucles',
  chapterSummary: 'for, while, for…of',
  takenSlugs: ['deja-la'],
}

/** Ce que le modele renvoie : les valeurs JSON des cas arrivent en texte. */
const CLAUDE_OUTPUT = {
  slug: 'somme-tableau',
  title: 'Somme d’un tableau',
  instructions: 'Écris `somme`.',
  functionName: 'somme',
  starterCode: 'function somme(nombres: number[]): number {}',
  solutionCode: 'function somme(nombres: number[]): number { return 0 }',
  hints: ['Pars de 0.'],
  testCases: [
    { argumentsJson: '[[1, 2, 3]]', expectedResultJson: '6', isHidden: false, description: null },
    { argumentsJson: '[[]]', expectedResultJson: '0', isHidden: true, description: 'vide' },
  ],
}

let parse: ReturnType<typeof vi.fn>
let generator: ClaudeExerciseGenerator

const answer = (parsed: unknown, stopReason = 'end_turn') =>
  parse.mockResolvedValue({ parsed_output: parsed, stop_reason: stopReason, content: [] })

beforeEach(() => {
  parse = vi.fn()
  const client = { beta: { messages: { parse } } } as unknown as Anthropic
  generator = new ClaudeExerciseGenerator(client, 'claude-opus-5-5')
})

describe('ClaudeExerciseGenerator', () => {
  it('convertit la sortie structurée de Claude en exercice', async () => {
    answer(CLAUDE_OUTPUT)

    expect(await generator.generate(BRIEF)).toEqual({
      slug: 'somme-tableau',
      title: 'Somme d’un tableau',
      instructions: 'Écris `somme`.',
      functionName: 'somme',
      starterCode: CLAUDE_OUTPUT.starterCode,
      solutionCode: CLAUDE_OUTPUT.solutionCode,
      hints: ['Pars de 0.'],
      testCases: [
        { arguments: [[1, 2, 3]], expectedResult: 6, isHidden: false, description: null },
        { arguments: [[]], expectedResult: 0, isHidden: true, description: 'vide' },
      ],
    })
  })

  it('demande au modèle configuré une sortie structurée, avec tout le brief', async () => {
    answer(CLAUDE_OUTPUT)

    await generator.generate(BRIEF)

    const [params] = parse.mock.calls[0]!
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      output_config: { format: expect.objectContaining({ type: 'json_schema' }) },
    })
    const prompt = JSON.stringify(params.messages)
    for (const part of [
      'somme avec une boucle',
      'beginner',
      'typescript',
      'Les boucles',
      'deja-la',
    ]) {
      expect(prompt).toContain(part)
    }
  })

  it.each([
    ['un refus du modèle', null, 'refusal'],
    ['une réponse tronquée', null, 'max_tokens'],
    [
      'des arguments qui ne sont pas du JSON',
      { ...CLAUDE_OUTPUT, testCases: [{ ...CLAUDE_OUTPUT.testCases[0], argumentsJson: '[1,' }] },
      'end_turn',
    ],
    [
      'des arguments qui ne sont pas un tableau',
      { ...CLAUDE_OUTPUT, testCases: [{ ...CLAUDE_OUTPUT.testCases[0], argumentsJson: '6' }] },
      'end_turn',
    ],
  ])('renvoie null pour %s', async (_name, parsed, stopReason) => {
    answer(parsed, stopReason)

    expect(await generator.generate(BRIEF)).toBeNull()
  })

  it.each([
    ['une panne réseau', new Anthropic.APIConnectionError({ message: 'ECONNRESET' })],
    [
      'une API surchargée',
      new Anthropic.InternalServerError(
        529,
        { type: 'overloaded_error' },
        'overloaded',
        new Headers(),
      ),
    ],
    [
      'une clé refusée',
      new Anthropic.AuthenticationError(
        401,
        { type: 'authentication_error' },
        'bad key',
        new Headers(),
      ),
    ],
  ])('signale l’IA indisponible sur %s', async (_name, error) => {
    parse.mockRejectedValue(error)

    await expect(generator.generate(BRIEF)).rejects.toBeInstanceOf(AiUnavailableError)
  })
})

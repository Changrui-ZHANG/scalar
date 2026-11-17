import Anthropic from '@anthropic-ai/sdk'

import type { Config } from '../config.ts'
import { ClaudeExerciseGenerator } from './claude-exercise-generator.ts'
import type { ExerciseGenerator } from './exercise-generator.ts'
import { FakeExerciseGenerator } from './fake-exercise-generator.ts'

type AiSettings = Pick<Config, 'NODE_ENV' | 'AI_MODEL'> & Partial<Pick<Config, 'ANTHROPIC_API_KEY'>>

/** Jamais le faux en production : il y creerait des exercices d'exemple en silence. */
export function createExerciseGenerator(settings: AiSettings): ExerciseGenerator | null {
  if (settings.ANTHROPIC_API_KEY) {
    return new ClaudeExerciseGenerator(
      new Anthropic({ apiKey: settings.ANTHROPIC_API_KEY }),
      settings.AI_MODEL,
    )
  }
  return settings.NODE_ENV === 'production' ? null : new FakeExerciseGenerator()
}

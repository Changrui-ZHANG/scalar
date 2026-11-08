/**
 * Validation des formulaires du backoffice. Les cas de test sont saisis en
 * texte JSON : le schema verifie qu'ils se lisent, `toExerciseData` les relit.
 */
import { z } from 'zod'

import type { Exercise } from './content'

const slug = z
  .string()
  .trim()
  .max(64, '64 caractères au plus.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Minuscules, chiffres et tirets uniquement : « boucles-for ».',
  )
const status = z.enum(['draft', 'published', 'archived'])
const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} obligatoire.`).max(max, `${max} caractères au plus.`)

function parsesAs(text: string, check: (value: unknown) => boolean): boolean {
  try {
    return check(JSON.parse(text))
  } catch {
    return false
  }
}

export const loginInputSchema = z.object({
  email: z.string().trim().min(1, 'Email obligatoire.'),
  password: z.string().min(1, 'Mot de passe obligatoire.'),
})

export const trackInputSchema = z.object({
  name: required('Nom', 60),
  slug,
  summary: required('Résumé', 300),
  programmingLanguage: z.enum(['javascript', 'typescript']).nullable(),
  status,
})

export const chapterInputSchema = z.object({
  title: required('Titre', 100),
  slug,
  level: z.enum(['beginner', 'intermediate', 'advanced', 'ecosystem']),
  summary: required('Résumé', 500),
  status,
})

export const testCaseInputSchema = z.object({
  args: z
    .string()
    .refine((t) => parsesAs(t, Array.isArray), 'Un tableau JSON des arguments : [2, 3].'),
  expected: z
    .string()
    .refine((t) => parsesAs(t, () => true), 'Une valeur JSON : 5, "texte", [1, 2], null.'),
  label: z.string().trim().max(80, '80 caractères au plus.'),
  isHidden: z.boolean(),
})

export const exerciseInputSchema = z.object({
  title: required('Titre', 120),
  slug,
  statement: required('Énoncé', 5000),
  functionName: z
    .string()
    .trim()
    .regex(/^[A-Za-z_$][\w$]*$/, 'Un nom de fonction JavaScript : calculerAire.'),
  starterCode: required('Code de départ', 5000),
  solutionCode: required('Solution', 5000),
  /** Un indice par ligne. */
  hints: z.string(),
  testCases: z.array(testCaseInputSchema).min(1, 'Au moins un cas de test.'),
  status,
})

export type LoginInput = z.infer<typeof loginInputSchema>
export type TrackInput = z.infer<typeof trackInputSchema>
export type ChapterInput = z.infer<typeof chapterInputSchema>
export type TestCaseInput = z.infer<typeof testCaseInputSchema>
export type ExerciseInput = z.infer<typeof exerciseInputSchema>

/** Formulaire -> corps de l'API : indices decoupes, cas de test relus en JSON. */
export const toExerciseData = ({ statement, ...input }: ExerciseInput) => ({
  ...input,
  instructions: statement,
  hints: input.hints
    .split('\n')
    .map((h) => h.trim())
    .filter(Boolean),
  testCases: input.testCases.map((t) => ({
    arguments: JSON.parse(t.args) as unknown[],
    expectedResult: JSON.parse(t.expected) as unknown,
    description: t.label === '' ? null : t.label,
    isHidden: t.isHidden,
  })),
})

/** Exercice de l'API -> formulaire d'edition : l'inverse de `toExerciseData`. */
export const toExerciseInput = (exercise: Exercise): ExerciseInput => ({
  title: exercise.title,
  slug: exercise.slug,
  statement: exercise.instructions,
  functionName: exercise.functionName,
  starterCode: exercise.starterCode,
  solutionCode: exercise.solutionCode,
  hints: exercise.hints.join('\n'),
  testCases: exercise.testCases.map((t) => ({
    args: JSON.stringify(t.arguments),
    expected: JSON.stringify(t.expectedResult),
    label: t.description ?? '',
    isHidden: t.isHidden,
  })),
  status: exercise.status,
})

// Le code soumis ne passe que par Piston, jamais par `vm` ou `eval` : ce ne sont pas des mecanismes de securite.

import { stripTypeScriptTypes } from 'node:module'

import { z } from 'zod'

import { config } from '../config.ts'
import {
  EXECUTION_STATUS_LABELS,
  MAX_CODE_BYTES,
  MESSAGES,
  PISTON_LANGUAGE,
  PROGRAMMING_LANGUAGES,
  RUN_TIMEOUT_MS,
} from '../constants.ts'
import type { ProgrammingLanguage } from '../database/types.ts'
import { logger } from '../logger.ts'

export type ExecutionStatus = keyof typeof EXECUTION_STATUS_LABELS

export class EngineUnavailableError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    this.name = 'EngineUnavailableError'
  }
}

export interface PistonRun {
  readonly stdout: string
  readonly stderr: string
  readonly output: string
  readonly code: number | null
  readonly signal: string | null
  readonly status: string | null
  readonly message?: string | null
  readonly cpu_time?: number
  readonly wall_time?: number
  readonly memory?: number
}

export interface ExecutionResult {
  readonly status: ExecutionStatus
  readonly label: string
  readonly run: PistonRun
}

export const submissionSchema = z.object({
  // Absent pour les clients anterieurs a TypeScript : ils envoyaient du JavaScript.
  programmingLanguage: z
    .enum(
      PROGRAMMING_LANGUAGES,
      'Le champ « programmingLanguage » doit valoir « javascript » ou « typescript ».',
    )
    .default('javascript'),
  code: z
    .string('Le champ « code » est requis et doit être une chaîne de caractères.')
    .refine((code) => code.trim() !== '', 'Le code soumis est vide.')
    // Octets et non `length` : un caractere hors ASCII pese plusieurs octets.
    .refine(
      (code) => Buffer.byteLength(code, 'utf8') <= MAX_CODE_BYTES,
      `Le code soumis dépasse la limite de ${MAX_CODE_BYTES} octets.`,
    ),
})

export type Submission = z.infer<typeof submissionSchema>

export type SubmissionParse =
  | { readonly ok: true; readonly submission: Submission }
  | { readonly ok: false; readonly error: string }

export function parseSubmission(body: unknown): SubmissionParse {
  const result = submissionSchema.safeParse(body)

  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? MESSAGES.invalidRequest,
    }
  }

  return { ok: true, submission: result.data }
}

export type Conversion =
  { readonly ok: true; readonly code: string } | { readonly ok: false; readonly error: string }

// Types retires sans etre verifies ; le mode `strip` preserve les lignes et colonnes des erreurs.
export function toJavaScript(language: ProgrammingLanguage, code: string): Conversion {
  if (language === 'javascript') {
    return { ok: true, code }
  }

  try {
    return { ok: true, code: stripTypeScriptTypes(code, { mode: 'strip' }) }
  } catch (error: unknown) {
    const { code: kind, message } = error as { code?: string; message?: string }
    if (kind === 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') {
      return {
        ok: false,
        error: 'Cette syntaxe TypeScript (enum, namespace…) n’est pas encore prise en charge.',
      }
    }
    return {
      ok: false,
      error: `Erreur de syntaxe TypeScript : ${message ?? 'code illisible'}.`,
    }
  }
}

export function toExecutionStatus(status: string | null | undefined): ExecutionStatus {
  if (status === null || status === undefined) {
    return 'OK'
  }

  return status !== 'OK' && status in EXECUTION_STATUS_LABELS ? (status as ExecutionStatus) : 'XX'
}

export function describeStatus(status: ExecutionStatus): string {
  return EXECUTION_STATUS_LABELS[status]
}

export async function executeCode(code: string): Promise<ExecutionResult> {
  try {
    return await callEngine(code)
  } catch (error: unknown) {
    throw new EngineUnavailableError(error)
  }
}

async function callEngine(code: string): Promise<ExecutionResult> {
  const response = await fetch(`${config.PISTON_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: PISTON_LANGUAGE,
      version: config.PISTON_NODE_VERSION,
      files: [{ name: 'main.js', content: code }],
      run_timeout: RUN_TIMEOUT_MS,
      run_cpu_time: RUN_TIMEOUT_MS,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Le moteur a répondu ${response.status} ${response.statusText}: ${detail.slice(0, 500)}`,
    )
  }

  const payload = (await response.json()) as { readonly run?: PistonRun }
  if (!payload.run) {
    throw new Error('Réponse du moteur inattendue : champ « run » absent.')
  }

  // Un depassement de temps revient en HTTP 200 : seul `run.status` donne l'issue reelle.
  const status = toExecutionStatus(payload.run.status)

  return {
    status,
    label: describeStatus(status),
    run: payload.run,
  }
}

export async function hasJavascriptRuntime(): Promise<boolean> {
  try {
    const response = await fetch(`${config.PISTON_URL}/runtimes`)
    if (!response.ok) {
      return false
    }

    const runtimes = (await response.json()) as ReadonlyArray<{
      readonly language?: string
      readonly aliases?: readonly string[]
    }>

    return runtimes.some(
      (runtime) =>
        runtime.language === PISTON_LANGUAGE || runtime.aliases?.includes(PISTON_LANGUAGE),
    )
  } catch (error: unknown) {
    logger.warn({ err: error, url: config.PISTON_URL }, 'Interrogation des runtimes impossible')
    return false
  }
}

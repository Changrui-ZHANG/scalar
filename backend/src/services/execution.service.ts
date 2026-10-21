/**
 * Client du moteur d'execution Piston.
 *
 * Le code soumis par un utilisateur n'est jamais evalue dans ce processus : il
 * est transmis a un service isole (voir `piston` dans `compose.yaml`). Les
 * mecanismes integres a Node (`vm`, `eval`) sont exclus, leur documentation
 * indiquant explicitement qu'ils ne sont pas des mecanismes de securite.
 */

import { stripTypeScriptTypes } from 'node:module'

import { z } from 'zod'

import type { ProgrammingLanguage } from '../db/schema.ts'
import { logger } from '../logger.ts'

const PISTON_BASE_URL = process.env.PISTON_URL ?? 'http://piston:2000/api/v2'

const LANGUAGE = 'javascript'

/**
 * Epinglee, jamais « derniere en date » : la version demandee ici doit etre
 * exactement celle installee dans le moteur, sinon Piston refuse en 400.
 */
const LANGUAGE_VERSION = process.env.PISTON_NODE_VERSION ?? '20.11.1'

/** Plafond de taille du code accepte, verifie avant tout appel sortant. */
export const MAX_CODE_BYTES = 64 * 1024

/**
 * Doit rester aligne avec `PISTON_RUN_TIMEOUT` et `PISTON_RUN_CPU_TIME` dans
 * `compose.yaml`. Piston refuse en 400 toute limite demandee au-dela de sa
 * propre configuration -- il ne la rabote pas. Desynchroniser les deux fait
 * echouer *toutes* les executions, avec une erreur sans lien apparent avec le
 * code soumis.
 */
const RUN_TIMEOUT_MS = 5_000

/** Etat normalise d'une execution. `OK` remplace le `null` renvoye par Piston. */
export type ExecutionStatus = 'OK' | 'TO' | 'OL' | 'EL' | 'RE' | 'SG' | 'XX'

/** Etage d'execution tel que Piston le renvoie, restitue tel quel au client. */
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
  /** Libelle lisible derive de `status`, destine a l'affichage. */
  readonly label: string
  readonly run: PistonRun
}

const STATUS_LABELS: Readonly<Record<ExecutionStatus, string>> = {
  OK: 'Terminé',
  TO: 'Temps dépassé',
  OL: 'Sortie tronquée',
  EL: 'Sortie d’erreur tronquée',
  RE: 'Erreur d’exécution',
  SG: 'Interrompu par un signal',
  XX: 'Erreur interne du moteur',
}

/** Langages que le backend sait executer : les valeurs de l'enum en base. */
const PROGRAMMING_LANGUAGES = [
  'javascript',
  'typescript',
] as const satisfies readonly ProgrammingLanguage[]

/**
 * Corps accepte par `POST /api/v1/executions`.
 *
 * La validation se fait a la frontiere, avant tout appel sortant : une entree
 * malformee ne doit jamais atteindre le moteur d'execution.
 */
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
    // Compte des octets et non des caracteres : un caractere hors ASCII en
    // pese plusieurs, et `length` laisserait passer une charge utile au-dela
    // de la limite reelle.
    .refine(
      (code) => Buffer.byteLength(code, 'utf8') <= MAX_CODE_BYTES,
      `Le code soumis dépasse la limite de ${MAX_CODE_BYTES} octets.`,
    ),
})

export type Submission = z.infer<typeof submissionSchema>

export type SubmissionParse =
  | { readonly ok: true; readonly submission: Submission }
  | { readonly ok: false; readonly error: string }

/**
 * Valide le corps d'une soumission.
 *
 * @returns la soumission validee, ou le message d'erreur a renvoyer au client.
 */
export function parseSubmission(body: unknown): SubmissionParse {
  const result = submissionSchema.safeParse(body)

  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? 'Requête invalide.',
    }
  }

  return { ok: true, submission: result.data }
}

export type Conversion =
  { readonly ok: true; readonly code: string } | { readonly ok: false; readonly error: string }

/**
 * Ramene le code soumis a du JavaScript executable par le moteur.
 *
 * TypeScript : les annotations sont remplacees par des espaces, sans rien
 * deplacer -- les numeros de ligne et de colonne des erreurs restent ceux de
 * l'ecran. Les types ne sont PAS verifies : une erreur de typage passe.
 */
// TypeScript : les types sont retires sans etre verifies ; ajouter un
// passage `tsc` cote moteur quand Piston saura le faire dans le plafond de duree.
export function toJavaScript(language: ProgrammingLanguage, code: string): Conversion {
  if (language === 'javascript') {
    return { ok: true, code }
  }

  try {
    return { ok: true, code: stripTypeScriptTypes(code, { mode: 'strip' }) }
  } catch (error: unknown) {
    // `enum`, `namespace`, proprietes de parametres : syntaxes qui generent
    // du code, que le simple retrait des types ne sait pas traduire.
    const { code: kind, message } = error as { code?: string; message?: string }
    if (kind === 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') {
      return {
        ok: false,
        error: 'Cette syntaxe TypeScript (enum, namespace…) n’est pas encore prise en charge.',
      }
    }
    // Le message du lecteur TypeScript ne porte pas de numero de ligne : on le
    // restitue tel quel plutot qu'une phrase generique.
    return {
      ok: false,
      error: `Erreur de syntaxe TypeScript : ${message ?? 'code illisible'}.`,
    }
  }
}

/**
 * Normalise le champ `status` de Piston. Un `null` signifie une execution
 * menee a son terme ; toute autre valeur est un echec qualifie.
 */
export function toExecutionStatus(status: string | null | undefined): ExecutionStatus {
  if (status === null || status === undefined) {
    return 'OK'
  }

  return status !== 'OK' && status in STATUS_LABELS ? (status as ExecutionStatus) : 'XX'
}

export function describeStatus(status: ExecutionStatus): string {
  return STATUS_LABELS[status]
}

/**
 * Soumet le code au moteur et en restitue le resultat complet.
 *
 * @throws si le moteur est injoignable ou repond hors contrat. L'appelant
 * traduit cela en 503 : le detail reste cote serveur.
 */
export async function executeCode(code: string): Promise<ExecutionResult> {
  const response = await fetch(`${PISTON_BASE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: LANGUAGE,
      version: LANGUAGE_VERSION,
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

  // Un depassement de temps revient en HTTP 200 : l'issue reelle vit dans
  // `run.status`, jamais dans le code HTTP seul. Se fier au code HTTP
  // afficherait « terminé, sortie vide » sur une boucle infinie.
  const status = toExecutionStatus(payload.run.status)

  return {
    status,
    label: describeStatus(status),
    run: payload.run,
  }
}

/**
 * Indique si le moteur expose un runtime JavaScript.
 *
 * L'image Piston n'embarque aucun langage : sans amorcage, le moteur demarre
 * et ne sait rien executer. Sans cette verification, l'oubli se manifeste par
 * des erreurs sans rapport apparent avec sa cause.
 */
export async function hasJavascriptRuntime(): Promise<boolean> {
  try {
    const response = await fetch(`${PISTON_BASE_URL}/runtimes`)
    if (!response.ok) {
      return false
    }

    const runtimes = (await response.json()) as ReadonlyArray<{
      readonly language?: string
      readonly aliases?: readonly string[]
    }>

    return runtimes.some(
      (runtime) => runtime.language === LANGUAGE || runtime.aliases?.includes(LANGUAGE),
    )
  } catch (error: unknown) {
    // Un moteur injoignable au demarrage n'est pas fatal -- il peut monter
    // apres le backend -- mais l'avaler en silence rendrait l'absence de
    // runtime indiscernable d'une panne reseau.
    logger.warn({ err: error, url: PISTON_BASE_URL }, 'Interrogation des runtimes impossible')
    return false
  }
}

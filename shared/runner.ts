import * as v from 'valibot'

// Contrat du module `runner` (AD-3) : le travail depose n'a que ces trois
// cles, et le registre de langages est ferme a une seule entree en v1
// (AD-12 — seuls les langages interpretes et a machine virtuelle passent le
// systeme de fichiers en lecture seule).
export const LANGAGES_RUNNER = ['javascript'] as const

export type LangageRunner = (typeof LANGAGES_RUNNER)[number]

// Un cas de test tel que transmis au runner : son corps complet, y compris
// pour un test cache (AD-13 n'interdit que la fuite vers un navigateur — la
// projection `interne-runner` d'AD-21 est precisement celle qui porte ce
// corps).
export const runnerTestCaseSchema = v.strictObject({
  name: v.string(),
  code: v.string(),
})

export type RunnerTestCase = v.InferOutput<typeof runnerTestCaseSchema>

// `v.strictObject` refuse toute cle etrangere au lieu de l'ignorer en
// silence : un `image`, un `mount` ou une `command` glisses dans le corps
// font echouer la validation plutot que d'atteindre l'invocation Docker.
export const runnerJobSchema = v.strictObject({
  languageId: v.picklist(LANGAGES_RUNNER),
  code: v.string(),
  tests: v.array(runnerTestCaseSchema),
})

export type RunnerJob = v.InferOutput<typeof runnerJobSchema>

// Ce que l'API construit et envoie au depot. `languageId` n'y est pas
// restreint au registre ferme : c'est le runner seul qui l'applique a la
// reception (AD-3) et refuse toute valeur hors registre — l'emetteur n'a
// pas a la revalider avant.
export interface RunnerJobEnvoi {
  readonly languageId: string
  readonly code: string
  readonly tests: readonly RunnerTestCase[]
}

// Accuse d'admission (AD-26). Une admission refusee n'est pas un refus du
// depot : la position dit seulement que l'execution n'a pas encore
// commence, jamais que le travail est perdu. Valide a la reception cote
// adaptateur (AD-7 : aucune donnee externe, meme entre deux services de
// confiance, n'est consommee sans passer par un schema).
export const runnerAdmissionSchema = v.variant('admis', [
  v.strictObject({ admis: v.literal(true) }),
  v.strictObject({ admis: v.literal(false), position: v.number() }),
])

export type RunnerAdmission = v.InferOutput<typeof runnerAdmissionSchema>

// Ce que le runner rappelle a la fin d'une execution (AD-11, AD-24) : un
// resultat brut, jamais un verdict — la classification en quatre valeurs
// reste entierement a la story 2.6. Valide au bord (AD-7) comme tout corps
// entrant.
export const runnerCallbackSchema = v.strictObject({
  exitCode: v.nullable(v.number()),
  signal: v.nullable(v.string()),
  output: v.string(),
  outputTruncated: v.boolean(),
  finishedAt: v.pipe(v.string(), v.isoTimestamp()),
})

export type RunnerCallbackBody = v.InferOutput<typeof runnerCallbackSchema>

// La comparaison en temps constant des deux secrets (AD-16) vit cote backend
// et cote runner, jamais ici : ce fichier ne depend d'aucun module natif
// (voir `shared/tsconfig.json`), pour rester importable sans risque depuis un
// paquet navigateur.

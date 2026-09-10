import type { SubmissionFailureOrigin, SubmissionVerdict } from '@scalar/shared/submission.ts'

// Table deterministe (AD-24 : « la phrase d'interpretation en francais n'est
// pas produite par un modele de langage »), propriete du module
// `submissions`. Quatre familles, jamais la valeur brute de
// `SubmissionVerdict` : un verdict `error` recouvre trois causes tres
// differentes pour qui lit la phrase (typage, exception non interceptee,
// depot runner injoignable), quand un verdict `timeout` n'en recouvre qu'une.
export const FAMILLES_INTERPRETATION = ['typage', 'execution', 'timeout', 'plateforme'] as const

export type FamilleInterpretation = (typeof FAMILLES_INTERPRETATION)[number]

const PHRASES: Readonly<Record<FamilleInterpretation, string>> = {
  typage: 'Votre code ne compile pas : corrigez les erreurs de typage indiquées dans la sortie, puis renvoyez-le.',
  execution:
    "Votre code a rencontré une erreur pendant son exécution, en dehors d'une assertion de test. Corrigez-la puis renvoyez votre code.",
  timeout:
    "Votre code a dépassé la durée autorisée pour cette exécution. Vérifiez qu'il ne boucle pas indéfiniment, puis renvoyez-le.",
  plateforme: "Le service d'exécution est injoignable pour le moment. Réessayez dans quelques instants.",
}

export function phraseInterpretation(famille: FamilleInterpretation): string {
  return PHRASES[famille]
}

export interface EntreesFamilleInterpretation {
  readonly verdict: SubmissionVerdict
  readonly failureOrigin?: SubmissionFailureOrigin
  // Les tests ont-ils seulement demarre (`firstTestAt` pose) ? Seul signal
  // deja persiste qui distingue un echec de typage (jamais atteint
  // `node --test`) d'une exception non interceptee (l'a atteint puis a
  // crashe) — voir le Design Notes de spec-2-6.
  readonly aDemarreLesTests: boolean
}

// Deduit la famille depuis les seules donnees deja persistees sur une
// `Submission` : aucun champ supplementaire n'est necessaire (AD-15, aucune
// donnee redondante). `undefined` pour `passed`/`failed`, qui ne portent pas
// de phrase d'interpretation — le detail par test suffit a s'expliquer.
export function familleInterpretation(
  entrees: EntreesFamilleInterpretation,
): FamilleInterpretation | undefined {
  if (entrees.verdict === 'timeout') {
    return 'timeout'
  }

  if (entrees.verdict !== 'error') {
    return undefined
  }

  if (entrees.failureOrigin === 'plateforme') {
    return 'plateforme'
  }

  return entrees.aDemarreLesTests ? 'execution' : 'typage'
}

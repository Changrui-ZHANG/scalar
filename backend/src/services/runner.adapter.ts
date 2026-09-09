import * as v from 'valibot'
import { DELAI_MAX_DEPOT_RUNNER_MS, TENTATIVES_MAX_DEPOT_RUNNER } from '@scalar/shared/limites.ts'
import { runnerAdmissionSchema, type RunnerAdmission, type RunnerJobEnvoi } from '@scalar/shared/runner.ts'

const EN_TETE_SECRET = 'x-scalar-runner-secret'

function journaliserErreur(message: string, extra: Record<string, unknown>): void {
  console.error(JSON.stringify({ niveau: 'error', message, ...extra }))
}

// Seul point de contact du backend avec le runner (AD-3, AD-26) : depose le
// travail et repart, jamais bloquant au-dela du delai declare (AD-28). Ce
// delai ne couvre que la decision d'admission — le runner ne bloque jamais
// sur l'execution elle-meme. `undefined` signifie que le depot a echoue
// apres toutes les tentatives : au service appelant de liberer le quota
// reserve et de degrader (AD-28), la Soumission restant `queued`.
export class RunnerAdapter {
  private readonly urlRunner: string
  private readonly secretDepot: string

  constructor(urlRunner: string, secretDepot: string) {
    this.urlRunner = urlRunner
    this.secretDepot = secretDepot
  }

  async deposer(submissionId: string, job: RunnerJobEnvoi): Promise<RunnerAdmission | undefined> {
    for (let tentative = 0; tentative < TENTATIVES_MAX_DEPOT_RUNNER; tentative += 1) {
      const controleur = new AbortController()
      const minuteur = setTimeout(() => controleur.abort(), DELAI_MAX_DEPOT_RUNNER_MS)

      let reponse: Response

      try {
        reponse = await fetch(`${this.urlRunner}/executions/${encodeURIComponent(submissionId)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', [EN_TETE_SECRET]: this.secretDepot },
          body: JSON.stringify(job),
          signal: controleur.signal,
        })
      } catch (erreur) {
        // Reseau injoignable ou delai depasse : la tentative suivante,
        // s'il en reste une, repart de zero — jamais de reprise sur une
        // tentative deja en vol.
        journaliserErreur('depot runner : reseau injoignable ou delai depasse', {
          submissionId,
          tentative,
          detail: erreur instanceof Error ? erreur.message : String(erreur),
        })

        continue
      } finally {
        clearTimeout(minuteur)
      }

      if (!reponse.ok) {
        journaliserErreur('depot runner : reponse non-2xx', {
          submissionId,
          tentative,
          statut: reponse.status,
        })

        continue
      }

      let corps: unknown

      try {
        corps = await reponse.json()
      } catch (erreur) {
        journaliserErreur('depot runner : reponse JSON illisible', {
          submissionId,
          tentative,
          detail: erreur instanceof Error ? erreur.message : String(erreur),
        })

        continue
      }

      // Meme discipline que pour le travail depose et le rappel de fin
      // d'execution (AD-7) : aucune donnee externe n'est consommee sans
      // passer par un schema, meme entre deux services de confiance.
      const resultat = v.safeParse(runnerAdmissionSchema, corps)

      if (!resultat.success) {
        journaliserErreur('depot runner : reponse d admission invalide', { submissionId, tentative })

        continue
      }

      return resultat.output
    }

    return undefined
  }
}

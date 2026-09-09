import type { RunnerCallbackBody } from '@scalar/shared/runner.ts'

const EN_TETE_SECRET = 'x-scalar-runner-secret'

// Rappelle la route interne de l'API a la fin d'une execution, porteuse du
// secret du sens inverse (AD-16, AD-24) — jamais celui du depot. Best-effort :
// le runner ne detient aucun etat metier (AD-3) et ne rejoue pas ce rappel
// lui-meme ; une reprise sur echec releve de la politique de degradation
// d'AD-28, cote adaptateur, pas d'ici.
export async function rappelerApi(
  urlBase: string,
  secret: string,
  submissionId: string,
  corps: RunnerCallbackBody,
): Promise<void> {
  try {
    const reponse = await fetch(`${urlBase}/${encodeURIComponent(submissionId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [EN_TETE_SECRET]: secret },
      body: JSON.stringify(corps),
    })

    if (!reponse.ok) {
      console.error(
        JSON.stringify({
          niveau: 'error',
          message: 'rappel API refuse',
          submissionId,
          statut: reponse.status,
        }),
      )
    }
  } catch (erreur) {
    console.error(
      JSON.stringify({
        niveau: 'error',
        message: 'rappel API injoignable',
        submissionId,
        detail: erreur instanceof Error ? erreur.message : String(erreur),
      }),
    )
  }
}

import { timingSafeEqual } from 'node:crypto'
import express, { Router, type Express, type NextFunction, type Request, type Response } from 'express'
import * as v from 'valibot'
import { CODES_ERREUR, ErreurApi, type CodeErreur } from '@scalar/shared/erreurs.ts'
import { runnerJobSchema } from '@scalar/shared/runner.ts'
import type { Config } from '../config.ts'
import { Admission } from '../execution/admission.ts'
import { invoquerConteneur, type ResultatExecution } from '../execution/invoquerConteneur.ts'
import { rappelerApi } from '../rappel.ts'

const EN_TETE_SECRET = 'x-scalar-runner-secret'

// Comparaison en temps constant (AD-16) : jamais `===`, dont la duree fuit le
// prefixe commun entre la valeur recue et la valeur attendue.
function secretsEgaux(attendu: string, recu: string): boolean {
  const bufAttendu = Buffer.from(attendu, 'utf8')
  const bufRecu = Buffer.from(recu, 'utf8')

  if (bufAttendu.length !== bufRecu.length) {
    // Une comparaison de meme cout est faite quand meme, pour ne pas trahir
    // la longueur par un retour anticipe.
    timingSafeEqual(bufRecu, bufRecu)

    return false
  }

  return timingSafeEqual(bufAttendu, bufRecu)
}

// Assez pour le code soumis (50 000 caracteres, AD-7) et les tests d'un
// Exercice (100 000 octets, AD-8) transmis ensemble ; large de facto plutot
// qu'ajuste au plus juste, parce que le runner n'est joignable que depuis le
// reseau interne (AD-3) et ne sert donc jamais un appelant anonyme.
const TAILLE_MAX_CORPS_RUNNER = '512kb'

function garderSecret(secretAttendu: string) {
  return (requete: Request, _reponse: Response, suivant: NextFunction): void => {
    const recu = requete.headers[EN_TETE_SECRET]

    if (typeof recu !== 'string' || !secretsEgaux(secretAttendu, recu)) {
      suivant(new ErreurApi('SECRET_SERVICE_INVALIDE'))

      return
    }

    suivant()
  }
}

function codeDepuisErreurDeCorps(erreur: unknown): CodeErreur | undefined {
  const type = (erreur as { type?: unknown } | null)?.type

  if (type === 'entity.too.large') {
    return 'CORPS_TROP_VOLUMINEUX'
  }

  if (type === 'entity.parse.failed' || type === 'charset.unsupported' || type === 'encoding.unsupported') {
    return 'CORPS_ILLISIBLE'
  }

  return undefined
}

function gestionErreur(erreur: unknown, _requete: Request, reponse: Response, suivant: NextFunction): void {
  if (reponse.headersSent) {
    suivant(erreur)

    return
  }

  const code: CodeErreur =
    erreur instanceof ErreurApi ? erreur.code : (codeDepuisErreurDeCorps(erreur) ?? 'ERREUR_INTERNE')
  const definition = CODES_ERREUR[code]

  if (code === 'ERREUR_INTERNE') {
    console.error(
      JSON.stringify({
        niveau: 'error',
        message: 'erreur non traitee sur une requete du runner',
        detail: erreur instanceof Error ? erreur.message : String(erreur),
      }),
    )
  }

  reponse.status(definition.statut).json({ code, message: definition.message })
}

// Racine de composition HTTP du runner : une seule route de depot, gardee
// par le secret du sens API -> runner (AD-16), un travail a forme fermee
// (AD-3), et une admission qui ne bloque jamais la reponse (AD-26).
export function construireApp(config: Config): Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: TAILLE_MAX_CORPS_RUNNER }))

  const admission = new Admission(config.PLAFOND_CONCURRENCE)
  const routeur = Router()

  routeur.post(
    '/executions/:submissionId',
    garderSecret(config.SECRET_RUNNER_DEPOT),
    (requete: Request, reponse: Response, suivant: NextFunction) => {
      const submissionId = requete.params['submissionId']

      if (typeof submissionId !== 'string' || submissionId.length === 0) {
        suivant(new ErreurApi('TRAVAIL_RUNNER_INVALIDE'))

        return
      }

      const resultat = v.safeParse(runnerJobSchema, requete.body)

      if (!resultat.success) {
        suivant(new ErreurApi('TRAVAIL_RUNNER_INVALIDE'))

        return
      }

      const job = resultat.output
      const decision = admission.essayer()

      // La reponse part immediatement : l'appel API -> runner depose et
      // repart, jamais bloquant (AD-26). L'execution reelle, admise ou mise
      // en file, continue derriere sans que quiconque l'attende ici.
      reponse.status(202).json(decision.admis ? { admis: true } : { admis: false, position: decision.position })

      void decision.attendreTour
        .then(() => invoquerConteneur(job))
        // Un echec de `invoquerConteneur` (demon injoignable, image absente,
        // `createContainer` en erreur...) ne doit jamais faire disparaitre
        // l'execution sans rappel : le runner ne detenant aucun etat (AD-3),
        // c'est le seul moyen pour l'API d'apprendre qu'une Soumission
        // admise ou mise en file ne recevra jamais de resultat reel. Le
        // rappel part donc toujours, avec un resultat synthetique la ou une
        // execution reelle a echoue avant de produire quoi que ce soit —
        // jamais un verdict (2.6), seulement de quoi ne pas laisser la
        // Soumission bloquee indefiniment sur `running` sans aucune trace.
        .catch((erreur: unknown): ResultatExecution => {
          console.error(
            JSON.stringify({
              niveau: 'error',
              message: 'execution du travail en echec avant tout resultat',
              submissionId,
              detail: erreur instanceof Error ? erreur.message : String(erreur),
            }),
          )

          return {
            exitCode: null,
            signal: null,
            output: `Echec interne du runner, avant toute execution : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
            outputTruncated: false,
            killedByHost: false,
          }
        })
        .then((resultatExecution) =>
          rappelerApi(config.URL_RAPPEL_API, config.SECRET_RUNNER_RAPPEL, submissionId, {
            exitCode: resultatExecution.exitCode,
            signal: resultatExecution.signal,
            output: resultatExecution.output,
            outputTruncated: resultatExecution.outputTruncated,
            finishedAt: new Date().toISOString(),
          }),
        )
        .finally(() => admission.liberer())
    },
  )

  app.use(routeur)
  app.use((_requete: Request, _reponse: Response, suivant: NextFunction) => {
    suivant(new ErreurApi('ROUTE_INTROUVABLE'))
  })
  app.use(gestionErreur)

  return app
}

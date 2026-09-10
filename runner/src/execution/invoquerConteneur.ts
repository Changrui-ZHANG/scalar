import { randomBytes } from 'node:crypto'
import { request as requeteHttp } from 'node:http'
import { Writable, type Duplex } from 'node:stream'
import Docker from 'dockerode'
import { TRONCATURE_SORTIE_LIGNES_MAX, TRONCATURE_SORTIE_OCTETS_MAX } from '@scalar/shared/limites.ts'
import type { RunnerJob, RunnerTestResult } from '@scalar/shared/runner.ts'
import { resoudreImage } from './registre.ts'
import {
  CHEMIN_SCRIPT_WRAPPER,
  MARQUEUR_DEBUT_RESULTAT,
  MARQUEUR_FIN_RESULTAT,
  fichiersVerificationTypage,
} from './verificationTypage.ts'

// Reprend l'invocation Docker durcie du pic (spike/sandbox-2-1/lancer.ts:115-155)
// via `dockerode` plutot que le binaire `docker` en sous-processus. Toutes les
// limites d'AD-12 restent explicitement declarees ici, rien d'implicite.
const LIMITES = {
  processeurNanoCpus: 1_000_000_000, // --cpus 1
  memoireOctets: 256 * 1024 * 1024, // --memory (et --memory-swap egal, contre le report en swap)
  processus: 64, // --pids-limit
  descripteurs: 256, // --ulimit nofile
  // --ulimit fsize : plafond par fichier (jamais cumulatif) applique par le
  // noyau a tout processus du conteneur, extraction du tar comprise. Porte a
  // 12 Mo (etait 2 Mo avant la story 2.6) parce que le plus gros fichier
  // embarque (`typescript.js`, environ 9,1 Mo) depassait l'ancien plafond :
  // `tar` recevait alors SIGXFSZ en l'ecrivant, le conteneur mourait avant
  // meme d'avoir lu tout `stdin`, et l'ecriture du tar echouait par un EOF
  // cote hote — jamais un blocage, mais un echec disproportionne pour une
  // borne qui ne visait que la sortie d'un programme soumis.
  tailleEcritureOctets: 12 * 1024 * 1024,
  // Taille du tmpfs /work. Portee a 32 Mo (etait 16 Mo avant la story 2.6) :
  // le compilateur TypeScript embarque (`verificationTypage.ts`) pese
  // environ 10 Mo une fois les fichiers de bibliotheque inutiles ecartes,
  // et le code soumis reste tres loin de cette taille.
  espaceTravail: '32m',
  dureeMs: 20_000, // surveillance cote hote
  sursisAvantAbandonMs: 5_000, // delai apres `kill` avant d'abandonner l'attente du demon
}

const ETIQUETTE_RUNNER = 'scalar-runner'

export interface ResultatExecution {
  readonly exitCode: number | null
  readonly signal: string | null
  readonly output: string
  readonly outputTruncated: boolean
  // Decide uniquement par le runner (host kill), jamais deduit d'un delai
  // applicatif (AD-11) : nomme comme le champ homonyme du rappel
  // (`RunnerCallbackBody.timedOut`), une seule source de verite.
  readonly timedOut: boolean
  // Detail par test resolu, extrait du message JSON de fin du wrapper
  // (`verificationTypage.ts`). Vide quand la compilation echoue avant tout
  // lancement de `node --test`.
  readonly tests: readonly RunnerTestResult[]
  // Absent pour la meme raison que `tests` est vide : la compilation a
  // echoue avant que le wrapper ne pose cet instant.
  readonly firstTestAt?: string
}

// ---------------------------------------------------------------------------
// Archive tar (ustar) construite en memoire : le code entre par l'entree
// standard et n'est jamais monte depuis l'hote (patron du pic, inchange).
// ---------------------------------------------------------------------------

function enTeteTar(nom: string, taille: number): Buffer {
  const entete = Buffer.alloc(512)
  const octal = (valeur: number, longueur: number): string =>
    `${valeur.toString(8).padStart(longueur - 1, '0')}\0`

  entete.write(nom, 0, 100, 'ascii')
  entete.write(octal(0o644, 8), 100, 8, 'ascii')
  entete.write(octal(65534, 8), 108, 8, 'ascii')
  entete.write(octal(65534, 8), 116, 8, 'ascii')
  entete.write(octal(taille, 12), 124, 12, 'ascii')
  entete.write(octal(Math.floor(Date.now() / 1000), 12), 136, 12, 'ascii')
  entete.write('        ', 148, 8, 'ascii')
  entete.write('0', 156, 1, 'ascii')
  entete.write('ustar\0', 257, 6, 'ascii')
  entete.write('00', 263, 2, 'ascii')

  let somme = 0
  for (const octet of entete) somme += octet
  entete.write(`${somme.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')

  return entete
}

interface FichierTar {
  readonly nom: string
  readonly contenu: Buffer
}

function entreeTar(fichier: FichierTar): Buffer {
  const rembourrage = Buffer.alloc((512 - (fichier.contenu.length % 512)) % 512)

  return Buffer.concat([enTeteTar(fichier.nom, fichier.contenu.length), fichier.contenu, rembourrage])
}

// Archive a plusieurs fichiers (story 2.6 : le compilateur TypeScript et son
// wrapper rejoignent `soumission.ts`) : un seul marqueur de fin d'archive
// (deux blocs nuls), a la toute fin — deux blocs nuls entre deux entrees
// seraient lus par `tar` comme une fin d'archive prematuree.
function construireTar(fichiers: readonly FichierTar[]): Buffer {
  return Buffer.concat([...fichiers.map(entreeTar), Buffer.alloc(1024)])
}

// Un seul fichier combine le code soumis et les cas de test, comme le
// faisait chaque `cas/*.ts` du pic : les imports du lanceur de tests natif
// sont ajoutes une seule fois, ici, plutot que repetes par cas.
function construireScript(job: RunnerJob): string {
  const imports = "import test from 'node:test'\nimport assert from 'node:assert/strict'\n\n"
  const tests = job.tests.map((cas) => cas.code).join('\n\n')

  return `${imports}${job.code}\n\n${tests}\n`
}

// Rend la plus grande limite <= `limite` qui ne coupe pas une sequence
// UTF-8 multi-octets en son milieu. Sans ceci, `buffer.subarray(0,
// limite).toString('utf8')` coupe parfois au milieu d'un caractere et Node
// le remplace silencieusement par U+FFFD — un caractere illisible exactement
// a la frontiere de troncature, jamais signale comme tel.
export function limiteUtf8Valide(tampon: Buffer, limite: number): number {
  if (limite >= tampon.length) return tampon.length
  if (limite <= 0) return 0

  let debut = limite - 1
  let pas = 0

  // Recule jusqu'au dernier octet qui n'est pas une continuation
  // (10xxxxxx) : soit un octet ASCII (0xxxxxxx), soit l'octet de tete
  // d'une sequence multi-octets (11xxxxxx). Au plus 3 pas en arriere, la
  // plus longue sequence UTF-8 faisant 4 octets.
  while (debut > 0 && pas < 3 && (tampon[debut]! & 0xc0) === 0x80) {
    debut -= 1
    pas += 1
  }

  const octet = tampon[debut]!

  if ((octet & 0x80) === 0) {
    // ASCII : une sequence d'un seul octet, toujours entiere. Coupe valide.
    return limite
  }

  const longueurSequence =
    (octet & 0xf8) === 0xf0 ? 4 : (octet & 0xf0) === 0xe0 ? 3 : (octet & 0xe0) === 0xc0 ? 2 : 1

  // La sequence commencee en `debut` tient-elle entierement avant `limite` ?
  return debut + longueurSequence <= limite ? limite : debut
}

function ajouterAvecTroncature(
  etat: { sortie: string; tronque: boolean },
  morceau: Buffer,
): void {
  if (etat.tronque) return

  etat.sortie += morceau.toString('utf8')

  const tampon = Buffer.from(etat.sortie, 'utf8')

  if (tampon.length > TRONCATURE_SORTIE_OCTETS_MAX) {
    const limite = limiteUtf8Valide(tampon, TRONCATURE_SORTIE_OCTETS_MAX)
    etat.sortie = tampon.subarray(0, limite).toString('utf8')
    etat.tronque = true

    return
  }

  const lignes = etat.sortie.split('\n')

  if (lignes.length > TRONCATURE_SORTIE_LIGNES_MAX) {
    etat.sortie = lignes.slice(0, TRONCATURE_SORTIE_LIGNES_MAX).join('\n')
    etat.tronque = true
  }
}

interface ResultatWrapper {
  readonly output: string
  readonly tests: readonly RunnerTestResult[]
  readonly firstTestAt?: string
}

// Extrait le message JSON de fin ecrit par le wrapper d'execution
// (`verificationTypage.ts`), repere entre ses deux marqueurs, et le retire de
// la sortie rendue a l'appelant — jamais visible dans ce que verra
// l'apprenant. Absent quand la compilation TypeScript a echoue (le wrapper
// sort avant de l'ecrire) ou quand la sortie a ete tronquee avant de
// l'atteindre : dans les deux cas, `tests` reste vide plutot que d'inventer
// un detail par test.
function extraireResultatWrapper(sortie: string): ResultatWrapper {
  const debut = sortie.lastIndexOf(MARQUEUR_DEBUT_RESULTAT)

  if (debut === -1) {
    return { output: sortie, tests: [] }
  }

  const finMarqueur = sortie.indexOf(MARQUEUR_FIN_RESULTAT, debut)
  const finCharge = debut + MARQUEUR_DEBUT_RESULTAT.length
  const chargeUtile = sortie.slice(finCharge, finMarqueur === -1 ? sortie.length : finMarqueur)
  const finRetrait = finMarqueur === -1 ? sortie.length : finMarqueur + MARQUEUR_FIN_RESULTAT.length
  const sortieNettoyee = (sortie.slice(0, debut) + sortie.slice(finRetrait)).replace(/\n+$/, '')

  try {
    const parsed = JSON.parse(chargeUtile) as { firstTestAt?: string; tests?: unknown }

    return {
      output: sortieNettoyee,
      tests: Array.isArray(parsed.tests) ? (parsed.tests as RunnerTestResult[]) : [],
      firstTestAt: parsed.firstTestAt,
    }
  } catch {
    return { output: sortieNettoyee, tests: [] }
  }
}

// Attend `promesse` au plus `ms` : au-dela, rend le repli au lieu de
// continuer a attendre. Necessaire pour la suppression du conteneur, seul
// appel dockerode de cette fonction qui n'a pas deja de surveillance de
// duree — un demon qui ne repond plus a un appel HTTP du pilote ne doit pas
// bloquer indefiniment le jeton de concurrence que cette execution retient.
function avecPlafond<T>(promesse: Promise<T>, ms: number, repli: () => T): Promise<T> {
  return new Promise((resoudre, rejeter) => {
    const minuteur = setTimeout(() => resoudre(repli()), ms)
    minuteur.unref()

    promesse.then(
      (valeur) => {
        clearTimeout(minuteur)
        resoudre(valeur)
      },
      (erreur: unknown) => {
        clearTimeout(minuteur)
        rejeter(erreur)
      },
    )
  })
}

function journaliserErreur(message: string, extra: Record<string, unknown>): void {
  console.error(JSON.stringify({ niveau: 'error', message, ...extra }))
}

interface ModemInterne {
  readonly version?: string
  readonly socketPath?: string
  getSocketPath?: () => Promise<string>
}

// Contourne un defaut de `docker-modem` : `Modem.dial()` serialise
// systematiquement les options d'appel en JSON dans le corps de toute
// requete POST — y compris `attach`, qui n'attend aucun corps — et ce
// contenu fantome (`{"hijack":true,"stream":true,"stdin":true}`) peut
// rester en attente sur la connexion au moment ou le demon la fait basculer
// en flux brut hijacke, livrant alors ces octets au conteneur en tete de
// son entree standard. Constate empiriquement par comparaison octet a
// octet du contenu recu par le conteneur (README de cette investigation :
// memes octets a chaque occurrence, apparition non deterministe — quelques
// executions sur plusieurs dizaines) : c'est la source de la corruption de
// tar signalee en revue, jamais une question de timing du cote de ce
// fichier. Supprimer le corps sans le remplacer bloque a son tour : sans
// corps ni `end()` (necessaire ici, l'appelant continue d'ecrire apres),
// docker-modem n'appelle jamais `flushHeaders()`, et la requete ne part
// jamais — `attach()` ne resout donc jamais. La construction manuelle
// ci-dessous n'a ni l'un ni l'autre defaut : aucun corps, et un
// `flushHeaders()` explicite.
function attacherEcritureStdin(docker: Docker, idConteneur: string): Promise<Duplex> {
  const modem = docker.modem as ModemInterne

  const resoudreCheminSocket = async (): Promise<string> => {
    if (typeof modem.getSocketPath === 'function') {
      return modem.getSocketPath()
    }

    return modem.socketPath ?? ''
  }

  return resoudreCheminSocket().then(
    (socketPath) =>
      new Promise<Duplex>((resoudre, rejeter) => {
        const prefixeVersion = modem.version ? `/${modem.version}` : ''
        const requete = requeteHttp({
          socketPath,
          path: `${prefixeVersion}/containers/${idConteneur}/attach?stream=1&stdin=1`,
          method: 'POST',
          headers: { Connection: 'Upgrade', Upgrade: 'tcp' },
        })

        requete.on('upgrade', (_reponse, socket: Duplex, tete: Buffer) => {
          if (tete.length > 0 && 'unshift' in socket) {
            ;(socket as unknown as { unshift: (b: Buffer) => void }).unshift(tete)
          }

          resoudre(socket)
        })
        // Sans ce gestionnaire, un refus du demon qui ne bascule jamais en
        // hijack (conteneur introuvable, par exemple) laisserait cette
        // promesse pendre indefiniment : aucun des deux autres evenements ne
        // se produirait jamais.
        requete.on('response', (reponse) => {
          rejeter(new Error(`attache stdin refusee par le demon (statut ${reponse.statusCode})`))
        })
        requete.on('error', rejeter)
        requete.flushHeaders()
      }),
  )
}

export async function invoquerConteneur(job: RunnerJob): Promise<ResultatExecution> {
  const docker = new Docker()
  const image = resoudreImage(job.languageId)
  // Nom unique par execution (jamais une etiquette partagee) : corrige le
  // defaut du pic signale dans `deferred-work.md`, ou deux pilotes concurrents
  // se detruisaient mutuellement leurs conteneurs.
  const nom = `${ETIQUETTE_RUNNER}-${randomBytes(8).toString('hex')}`
  const tar = construireTar([
    { nom: 'soumission.ts', contenu: Buffer.from(construireScript(job), 'utf8') },
    ...fichiersVerificationTypage().map((fichier) => ({ nom: fichier.chemin, contenu: fichier.contenu })),
  ])

  const conteneur = await docker.createContainer({
    name: nom,
    Image: image,
    Labels: { [ETIQUETTE_RUNNER]: '1' },
    Cmd: ['sh', '-c', `tar -xf - -C /work && exec node ${CHEMIN_SCRIPT_WRAPPER}`],
    WorkingDir: '/work',
    User: '65534:65534',
    OpenStdin: true,
    StdinOnce: true,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    HostConfig: {
      NetworkMode: 'none',
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges'],
      ReadonlyRootfs: true,
      Tmpfs: { '/work': `rw,noexec,nosuid,nodev,size=${LIMITES.espaceTravail},mode=1777` },
      PidsLimit: LIMITES.processus,
      Memory: LIMITES.memoireOctets,
      MemorySwap: LIMITES.memoireOctets,
      NanoCpus: LIMITES.processeurNanoCpus,
      Ulimits: [
        { Name: 'nofile', Soft: LIMITES.descripteurs, Hard: LIMITES.descripteurs },
        { Name: 'fsize', Soft: LIMITES.tailleEcritureOctets, Hard: LIMITES.tailleEcritureOctets },
      ],
    },
  })

  const etatSortie = { sortie: '', tronque: false }
  let tueParHote = false
  let fini = false
  let minuteurDelai: NodeJS.Timeout | undefined
  let minuteurSecours: NodeJS.Timeout | undefined

  function annulerMinuteurs(): void {
    fini = true
    if (minuteurDelai) clearTimeout(minuteurDelai)
    if (minuteurSecours) clearTimeout(minuteurSecours)
  }

  try {
    // Deux connexions d'attache separees, jamais une seule : combiner
    // lecture et ecriture sur le meme flux hijacke ferme aussi le cote
    // lecture des qu'on clot le cote ecriture (constate empiriquement contre
    // Docker Desktop — la sortie du conteneur se perdait entierement des que
    // `flux.end()` fermait le flux combine, alors que le conteneur
    // continuait puis se terminait normalement). Le flux d'ecriture est donc
    // jetable, seul le flux de lecture doit survivre jusqu'a la fin.
    const fluxLecture = await conteneur.attach({ stream: true, stdout: true, stderr: true })
    // Construction manuelle : voir le commentaire d'`attacherEcritureStdin`
    // plus haut, sur le defaut de `docker-modem` que ce contournement evite.
    const fluxEcriture = await attacherEcritureStdin(docker, conteneur.id)

    const stdout = new Writable({
      write(chunk: Buffer, _enc, callback) {
        ajouterAvecTroncature(etatSortie, chunk)
        callback()
      },
    })
    const stderr = new Writable({
      write(chunk: Buffer, _enc, callback) {
        ajouterAvecTroncature(etatSortie, chunk)
        callback()
      },
    })
    docker.modem.demuxStream(fluxLecture, stdout, stderr)

    await conteneur.start()
    fluxEcriture.end(tar)

    // Premier niveau de garde : a l'echeance declaree, le conteneur est tue —
    // un depassement de duree est un verdict, jamais un blocage laisse courir
    // (AD-12).
    minuteurDelai = setTimeout(() => {
      if (fini) return
      tueParHote = true
      void conteneur.kill().catch((erreur: unknown) => {
        journaliserErreur('docker kill a echoue', { nom, detail: erreur instanceof Error ? erreur.message : String(erreur) })
      })
    }, LIMITES.dureeMs)
    minuteurDelai.unref()

    const attenteConteneur = conteneur
      .wait()
      .then((info: { StatusCode: number }) => ({
        exitCode: info.StatusCode,
        signal: tueParHote ? 'SIGKILL' : null,
      }))

    // Second niveau : a la difference du pic, dockerode ne passe par aucun
    // process client separe qu'on pourrait achever par SIGKILL — l'appel HTTP
    // au demon est la seule chose qui pourrait pendre. Si le demon ne repond
    // toujours pas au `kill` passe le sursis declare, la seule sortie qui
    // respecte « jamais un blocage » est d'abandonner l'attente et de rendre
    // un resultat synthetique ; la suppression du conteneur reste tentee plus
    // bas, elle aussi bornee.
    const secours = new Promise<{ exitCode: number | null; signal: string | null }>((resoudre) => {
      minuteurSecours = setTimeout(() => {
        if (fini) return
        tueParHote = true
        journaliserErreur('le demon ne repond pas au kill apres le sursis, abandon de l attente', { nom })
        resoudre({ exitCode: null, signal: 'SIGKILL' })
      }, LIMITES.dureeMs + LIMITES.sursisAvantAbandonMs)
      minuteurSecours.unref()
    })

    const { exitCode, signal } = await Promise.race([attenteConteneur, secours])
    annulerMinuteurs()

    const resultatWrapper = extraireResultatWrapper(etatSortie.sortie)

    return {
      exitCode,
      signal,
      output: resultatWrapper.output,
      outputTruncated: etatSortie.tronque,
      timedOut: tueParHote,
      tests: resultatWrapper.tests,
      firstTestAt: resultatWrapper.firstTestAt,
    }
  } finally {
    annulerMinuteurs()

    // `docker rm -f`, attendu et son code de suppression verifie — jamais
    // `--rm`, qui detruit de facon asynchrone et laisserait le controle final
    // en course avec le demon (AD-12).
    const supprime = await avecPlafond(
      conteneur
        .remove({ force: true })
        .then(() => true)
        .catch((erreur: unknown) => {
          journaliserErreur('docker rm -f a echoue', {
            nom,
            detail: erreur instanceof Error ? erreur.message : String(erreur),
          })

          return false
        }),
      LIMITES.dureeMs,
      () => {
        journaliserErreur('suppression du conteneur abandonnee apres delai', { nom })

        return false
      },
    )

    if (!supprime) {
      journaliserErreur('conteneur potentiellement survivant', { nom })
    }
  }
}

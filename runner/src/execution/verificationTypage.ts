import { createRequire } from 'node:module'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { CODE_ECHEC_TYPAGE } from '@scalar/shared/runner.ts'

// Un fichier a embarquer dans le tar, chemin relatif a la racine de
// l'archive (donc a `/work` une fois extrait dans le conteneur).
export interface FichierEmbarque {
  readonly chemin: string
  readonly contenu: Buffer
}

// Fichiers de bibliotheque du compilateur (`lib.*.d.ts`) dont ce runner n'a
// aucun usage : aucun exercice ne s'execute dans un navigateur (AD-12), donc
// jamais besoin du DOM ni de ses hotes. Les exclure ramene l'archive
// embarquee d'environ 20 Mo a moins de 2 Mo.
const FRAGMENTS_LIB_EXCLUS = ['dom', 'webworker', 'scripthost']

function estLibExclue(nomFichier: string): boolean {
  const nom = nomFichier.toLowerCase()

  return FRAGMENTS_LIB_EXCLUS.some((fragment) => nom.includes(fragment))
}

let cacheFichiers: readonly FichierEmbarque[] | undefined

// Resout le compilateur TypeScript installe localement (promu en
// `dependencies`, cf `runner/package.json`) et ne retient que ce qui sert
// reellement a une compilation `noEmit` : le bundle du compilateur lui-meme
// et les `lib.*.d.ts` non exclus ci-dessus — jamais `tsc.js`, les paquets de
// langue ni le serveur de langage.
function fichiersTypescriptEmbarques(): FichierEmbarque[] {
  const resoudre = createRequire(import.meta.url)
  const dossierLib = dirname(resoudre.resolve('typescript/lib/typescript.js'))

  const fichiers: FichierEmbarque[] = [
    {
      chemin: 'node_modules/typescript/lib/typescript.js',
      contenu: readFileSync(join(dossierLib, 'typescript.js')),
    },
  ]

  for (const nomFichier of readdirSync(dossierLib)) {
    if (!nomFichier.startsWith('lib.') || !nomFichier.endsWith('.d.ts')) {
      continue
    }

    if (estLibExclue(nomFichier)) {
      continue
    }

    fichiers.push({
      chemin: `node_modules/typescript/lib/${nomFichier}`,
      contenu: readFileSync(join(dossierLib, nomFichier)),
    })
  }

  return fichiers
}

function copierRecursif(dossierSource: string, prefixeTar: string, fichiers: FichierEmbarque[]): void {
  for (const entree of readdirSync(dossierSource)) {
    const cheminSource = join(dossierSource, entree)

    if (statSync(cheminSource).isDirectory()) {
      copierRecursif(cheminSource, `${prefixeTar}/${entree}`, fichiers)

      continue
    }

    if (!entree.endsWith('.d.ts') && entree !== 'package.json') {
      continue
    }

    fichiers.push({ chemin: `${prefixeTar}/${entree}`, contenu: readFileSync(cheminSource) })
  }
}

// Resout `@types/node` installe localement et l'embarque integralement (ne
// retenir que `.d.ts` et `package.json`, jamais licence ni readme) : c'est la
// seule declaration ambiante pour tout module natif (`node:test`,
// `node:assert/strict`, `node:fs`, ...) et pour les globales du runtime
// (`console`, `fetch`, `setTimeout`, ...) que le compilateur doit connaitre
// sans acces reseau (AD-12) — une declaration ecrite a la main pour chacun de
// ces modules et globales serait sans fin et toujours incomplete face a ce
// qu'un exercice peut raisonnablement utiliser.
function fichiersTypesNodeEmbarques(): FichierEmbarque[] {
  const resoudre = createRequire(import.meta.url)
  const dossier = dirname(resoudre.resolve('@types/node/package.json'))
  const fichiers: FichierEmbarque[] = []

  copierRecursif(dossier, 'node_modules/@types/node', fichiers)

  return fichiers
}

// Lu une seule fois depuis le disque, mis en cache memoire (le contenu ne
// change jamais en cours de process).
function fichiersDependancesEmbarques(): readonly FichierEmbarque[] {
  if (!cacheFichiers) {
    cacheFichiers = [...fichiersTypescriptEmbarques(), ...fichiersTypesNodeEmbarques()]
  }

  return cacheFichiers
}

export const CHEMIN_SCRIPT_WRAPPER = 'executer.cjs'

// Construit le wrapper Node execute dans le conteneur (AD-12 : un seul
// process, `Cmd` unique). Compile `soumission.ts` via l'API TypeScript
// embarquee ; en cas d'echec, relaie les diagnostics sur la sortie standard
// et sort avec `CODE_ECHEC_TYPAGE`, sans jamais lancer les tests. En cas de
// succes, lance le lanceur de tests natif **en process**, via son API
// programmatique (`node:test`), et relaie sa sortie humaine (reporter TAP
// compose) sur la sortie standard — `invoquerConteneur` n'a besoin d'aucun
// changement a sa capture stdout/stderr existante. Puis ecrit son propre
// message JSON de fin — `firstTestAt` et le detail par test — repere par les
// marqueurs ci-dessous pour que `invoquerConteneur` puisse l'extraire sans
// ambiguite avec la sortie du programme de l'apprenant.
//
// Deviation assumee vis-a-vis du Design Notes de la spec (« lance node
// --test --test-reporter=json soumission.ts en enfant ») : constate contre
// un demon Docker reel, ce reporter integre n'existe plus sur la version de
// Node de l'image (`node:24-alpine`, seuls `tap`/`spec`/`dot`/`junit`/`lcov`
// le sont). L'API programmatique rend le meme comportement observable —
// compilation puis tests, meme sortie relayee, meme detail par test — sans
// dependre d'un flag CLI absent.
export const MARQUEUR_DEBUT_RESULTAT = '@@SCALAR_RESULTAT@@'
export const MARQUEUR_FIN_RESULTAT = '@@FIN_RESULTAT@@'

export function contenuScriptWrapper(): string {
  return `'use strict'
const { run } = require('node:test')
const { tap } = require('node:test/reporters')

const CODE_ECHEC_TYPAGE = ${CODE_ECHEC_TYPAGE}
const MARQUEUR_DEBUT = ${JSON.stringify(MARQUEUR_DEBUT_RESULTAT)}
const MARQUEUR_FIN = ${JSON.stringify(MARQUEUR_FIN_RESULTAT)}

function verifierTypage() {
  const ts = require('./node_modules/typescript/lib/typescript.js')
  const programme = ts.createProgram(['soumission.ts'], {
    noEmit: true,
    strict: false,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2023.d.ts'],
    skipLibCheck: true,
    // Resolution automatique de \`node_modules/@types/node\`, embarque a cote
    // (jamais un acces reseau) : seule facon de connaitre \`node:test\`,
    // \`node:assert/strict\` et les globales du runtime (\`console\`, \`fetch\`,
    // \`setTimeout\`, ...) sans les redeclarer a la main.
    types: ['node'],
  })
  const diagnostics = ts.getPreEmitDiagnostics(programme)

  if (diagnostics.length === 0) {
    return
  }

  const hote = {
    getCurrentDirectory: () => process.cwd(),
    getCanonicalFileName: (chemin) => chemin,
    getNewLine: () => require('node:os').EOL,
  }
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, hote))
  process.exit(CODE_ECHEC_TYPAGE)
}

function valeurTexte(valeur) {
  if (valeur === undefined || valeur === null) return undefined
  return typeof valeur === 'string' ? valeur : JSON.stringify(valeur)
}

// Lance le lanceur de tests natif en processus (jamais un enfant separe :
// \`node --test-reporter=json\` n'existe plus sur cette version de Node — le
// reporter integre s'appelle desormais \`spec\`/\`tap\`/\`dot\`/\`junit\`/\`lcov\`,
// aucun ne rend du JSON structure). La sortie humaine relayee reste
// identique (TAP compose puis relaye sur la sortie standard, comme le ferait
// un enfant) ; le detail par test est construit directement depuis les
// evenements \`test:pass\`/\`test:fail\` du flux, jamais reparse depuis du
// texte.
function lancerTests() {
  const firstTestAt = new Date().toISOString()
  const tests = []
  let toutReussi = true

  const flux = run({ files: ['soumission.ts'] })

  flux.on('test:pass', (evenement) => {
    tests.push({ name: evenement.name, status: 'passed' })
  })

  flux.on('test:fail', (evenement) => {
    toutReussi = false

    const erreur = (evenement.details && evenement.details.error) || {}
    // Seule une assertion \`node:assert\` (jamais un autre throw intercepte
    // par le lanceur, y compris l'echec synthetique porte par le nom du
    // fichier quand rien n'a pu demarrer) porte cette cause avec ce code :
    // c'est le seul signal qui distingue une assertion d'apprenant d'une
    // exception non interceptee (matrice de spec-2-6). Un echec qui n'est
    // pas une assertion n'est jamais ajoute a \`tests\` : son absence, avec un
    // code de sortie non nul, est justement le signal que lit
    // \`submission.service\`.
    const cause = erreur.cause || {}

    if (cause.code === 'ERR_ASSERTION') {
      tests.push({
        name: evenement.name,
        status: 'failed',
        expected: valeurTexte(cause.expected),
        actual: valeurTexte(cause.actual),
      })
    }
  })

  // \`{ end: false }\` : le flux TAP ne doit jamais clore \`process.stdout\`,
  // le message JSON de fin devant encore s'y ecrire juste apres.
  flux.compose(tap).pipe(process.stdout, { end: false })

  flux.once('end', () => {
    const message = '\\n' + MARQUEUR_DEBUT + JSON.stringify({ firstTestAt, tests }) + MARQUEUR_FIN + '\\n'

    // \`process.exit\` attend la confirmation d'ecriture (le rappel du flux,
    // jamais un delai arbitraire) : \`process.stdout\` est ici un pipe, pas un
    // TTY, et Node ne garantit pas qu'une ecriture soit deja rendue au
    // descripteur au moment ou ce rappel est pose sans attendre. Node
    // garantit en revanche l'ordre des ecritures sur un meme flux : ce
    // rappel ne se declenche qu'apres que la sortie TAP composee plus haut a
    // deja ete rendue, donc ni elle ni ce message ne sont tronques.
    process.stdout.write(message, () => process.exit(toutReussi ? 0 : 1))
  })
}

verifierTypage()
lancerTests()
`
}

// Ensemble complet des fichiers a embarquer pour la phase de verification de
// typage : le compilateur et `@types/node` (caches, lus du disque une
// fois), et le wrapper (construit en memoire, cout negligeable). Seul point
// d'entree que `invoquerConteneur` a besoin de connaitre.
export function fichiersVerificationTypage(): readonly FichierEmbarque[] {
  return [
    ...fichiersDependancesEmbarques(),
    { chemin: CHEMIN_SCRIPT_WRAPPER, contenu: Buffer.from(contenuScriptWrapper(), 'utf8') },
  ]
}

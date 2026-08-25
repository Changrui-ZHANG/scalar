import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { fileURLToPath, pathToFileURL } from 'node:url'
import mongoose from 'mongoose'
import { chargerConfig } from '../src/config/index.ts'
import { INDEX_REQUIS } from '../src/config/index-requis.ts'
import { BaseDonneesService, masquerUri } from '../src/services/base-donnees.service.ts'
import { enregistrerModeles, modeleUtilisateur } from '../src/models/index.ts'
import { normaliserAdresse } from '../src/models/utilisateur.model.ts'

const URI_TEST = process.env.MONGODB_URI_TEST
const RACINE = fileURLToPath(new URL('..', import.meta.url))

// Le chargement du graphe d'imports coute plusieurs secondes a froid : tout
// test qui lance le vrai point d'entree doit porter son propre delai, sinon
// les 5 s par defaut de vitest le font echouer sur un cache froid.
const DELAI_PROCESS_MS = 45_000

interface Resultat {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
}

// Un port fixe ferait passer les tests de refus pour la mauvaise raison
// (EADDRINUSE au lieu de l'index manquant).
async function portLibre(): Promise<string> {
  const serveur = createServer()

  await new Promise<void>((resoudre) => serveur.listen(0, '127.0.0.1', resoudre))

  const adresse = serveur.address()
  const port = typeof adresse === 'object' && adresse !== null ? adresse.port : 0

  await new Promise<void>((resoudre) => serveur.close(() => resoudre()))

  return String(port)
}

// L'environnement est reconstruit sans MONGODB_URI pour que le shell de
// l'executant ne fausse pas le cas « variable absente ».
function environnementPropre(supplement: Record<string, string>): Record<string, string> {
  const base: Record<string, string> = {}

  for (const [cle, valeur] of Object.entries(process.env)) {
    if (cle !== 'MONGODB_URI' && cle !== 'MONGODB_URI_TEST' && valeur !== undefined) {
      base[cle] = valeur
    }
  }

  return { ...base, ...supplement }
}

function lancer(supplement: Record<string, string>): ChildProcessWithoutNullStreams {
  return spawn(process.execPath, ['src/index.ts'], {
    cwd: RACINE,
    env: environnementPropre(supplement),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function lancerJusquAlaSortie(supplement: Record<string, string>): Promise<Resultat> {
  const enfant = lancer(supplement)

  let stdout = ''
  let stderr = ''

  enfant.stdout.on('data', (morceau: Buffer) => (stdout += morceau.toString()))
  enfant.stderr.on('data', (morceau: Buffer) => (stderr += morceau.toString()))

  // Course avec `error` : sans elle, un spawn impossible ne produit jamais
  // `exit` et le test pend jusqu'au delai de la suite, sans diagnostic.
  const [code] = (await Promise.race([
    once(enfant, 'exit'),
    once(enfant, 'error').then(([erreur]) => {
      throw erreur
    }),
  ])) as [number | null, string | null]

  return { code, stdout, stderr }
}

async function attendreDemarrage(enfant: ChildProcessWithoutNullStreams): Promise<() => string> {
  let stdout = ''

  // Le tube stderr doit etre draine, sinon l'enfant bloque quand il se remplit.
  enfant.stderr.resume()

  await new Promise<void>((resoudre, rejeter) => {
    const minuteur = setTimeout(
      () => rejeter(new Error(`pas demarre : ${stdout}`)),
      DELAI_PROCESS_MS - 5_000,
    )

    enfant.stdout.on('data', (morceau: Buffer) => {
      stdout += morceau.toString()

      if (stdout.includes('api demarree')) {
        clearTimeout(minuteur)
        resoudre()
      }
    })

    enfant.once('exit', () => {
      clearTimeout(minuteur)
      rejeter(new Error(`sorti avant d ecouter : ${stdout}`))
    })
  })

  return () => stdout
}

describe('configuration', () => {
  let erreurs: string[]

  beforeEach(() => {
    erreurs = []
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    vi.spyOn(console, 'error').mockImplementation((ligne: unknown) => {
      erreurs.push(String(ligne))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refuse de demarrer quand MONGODB_URI est absente, en la nommant', () => {
    expect(() => chargerConfig({ PORT: '3001' } as NodeJS.ProcessEnv)).toThrow('exit:1')
    expect(erreurs.join(' ')).toContain('MONGODB_URI')
  })

  it('refuse une MONGODB_URI vide', () => {
    expect(() => chargerConfig({ MONGODB_URI: '' } as NodeJS.ProcessEnv)).toThrow('exit:1')
    expect(erreurs.join(' ')).toContain('MONGODB_URI')
  })

  it('refuse une MONGODB_URI dont le schema est errone', () => {
    expect(() => chargerConfig({ MONGODB_URI: 'mongo://hote/base' } as NodeJS.ProcessEnv)).toThrow(
      'exit:1',
    )
    expect(erreurs.join(' ')).toContain('MONGODB_URI')
  })

  it('accepte les deux schemas valides', () => {
    for (const uri of ['mongodb://hote:27017/base', 'mongodb+srv://hote/base']) {
      expect(chargerConfig({ MONGODB_URI: uri } as NodeJS.ProcessEnv).MONGODB_URI).toBe(uri)
    }
  })
})

// Defense en profondeur : aucune erreur du pilote observee ne recopie l'URI,
// mais un seul message qui le ferait suffirait a journaliser un mot de passe.
// La fonction se teste donc directement, a chaque forme.
describe('masquage de la chaine de connexion', () => {
  it('masque la forme standard sans effacer le reste du message', () => {
    const masque = masquerUri('echec sur mongodb://user:secret@mongo:27017/scalar apres 2 essais')

    expect(masque).not.toContain('secret')
    expect(masque).toContain('echec sur')
    expect(masque).toContain('[uri masquee]')
  })

  it('masque la forme hebergee, celle qui porte les identifiants en production', () => {
    expect(masquerUri('mongodb+srv://user:secret@grappe.exemple.net/scalar')).not.toContain(
      'secret',
    )
  })

  it('masque des identifiants portes par un schema non reconnu', () => {
    expect(masquerUri('parse error: mongo://user:secret@hote/base')).not.toContain('secret')
  })

  it('masque deux chaines dans un meme message', () => {
    const masque = masquerUri('de mongodb://a:unmdp@h1/d vers mongodb://b:deuxmdp@h2/d')

    expect(masque).not.toContain('unmdp')
    expect(masque).not.toContain('deuxmdp')
  })

  it('laisse intact un texte sans chaine de connexion', () => {
    expect(masquerUri('connect ECONNREFUSED 127.0.0.1:1')).toBe('connect ECONNREFUSED 127.0.0.1:1')
  })
})

describe('normalisation de la cle d unicite', () => {
  it('rend identiques deux adresses de casse et d espaces differents', () => {
    expect(normaliserAdresse('Alice@Ex.COM ')).toBe(normaliserAdresse('alice@ex.com'))
  })

  it('rend identiques deux formes Unicode canoniquement equivalentes', () => {
    expect(normaliserAdresse('ａlice@ex.com')).toBe(normaliserAdresse('alice@ex.com'))
  })

  it('retire les caracteres de largeur nulle', () => {
    expect(normaliserAdresse('alice​@ex.com')).toBe('alice@ex.com')
  })

  // Le hook relie la saisie a l'index unique : c'est le seul lien entre les
  // deux, et il se verifie sans connexion — la validation mongoose est locale.
  it('remplit le champ indexe a la validation du document', async () => {
    const document = new (modeleUtilisateur())({ nomAffiche: 'Alice', adresse: 'Alice@Ex.COM ' })

    await document.validate()

    expect(document.adresseNormalisee).toBe('alice@ex.com')
  })

  it('laisse la validation parler quand l adresse manque, sans lever de TypeError', async () => {
    const document = new (modeleUtilisateur())({ nomAffiche: 'Alice' })

    await expect(document.validate()).rejects.toThrow(mongoose.Error.ValidationError)
  })
})

describe('registre de modeles', () => {
  it('reste sans effet quand il est rejoue, et ne garde qu un modele', () => {
    enregistrerModeles()
    const premier = modeleUtilisateur()

    expect(() => enregistrerModeles()).not.toThrow()
    expect(modeleUtilisateur()).toBe(premier)
    expect(Object.keys(mongoose.models).filter((nom) => nom === 'Utilisateur')).toHaveLength(1)
  })

  it('refuse un nom deja pris par un autre schema', () => {
    mongoose.deleteModel('Utilisateur')
    mongoose.model('Utilisateur', new mongoose.Schema({ autre: String }))

    try {
      expect(() => enregistrerModeles()).toThrow('deja enregistre avec un autre schema')
    } finally {
      mongoose.deleteModel('Utilisateur')
      enregistrerModeles()
    }
  })
})

describe('refus de demarrer, au niveau du process', () => {
  it(
    'sort en code non nul en nommant MONGODB_URI quand elle est absente',
    async () => {
      const resultat = await lancerJusquAlaSortie({ PORT: await portLibre() })

      expect(resultat.code).not.toBe(0)
      expect(resultat.stderr).toContain('MONGODB_URI')
      expect(resultat.stdout).not.toContain('api demarree')
    },
    DELAI_PROCESS_MS,
  )

  it(
    'sort en code non nul quand la base est injoignable, sans exposer l URI',
    async () => {
      const resultat = await lancerJusquAlaSortie({
        PORT: await portLibre(),
        MONGODB_URI: 'mongodb://utilisateur:motdepasse@127.0.0.1:1/scalar',
      })

      expect(resultat.code).not.toBe(0)
      expect(resultat.stdout).not.toContain('api demarree')
      expect(resultat.stderr).not.toContain('motdepasse')
      expect(resultat.stderr).not.toContain('mongodb://')
    },
    DELAI_PROCESS_MS,
  )

  it('rejette une connexion vers un port ferme au lieu d ouvrir le sien', async () => {
    const service = new BaseDonneesService()

    await expect(service.connecter('mongodb://127.0.0.1:1/scalar', 500)).rejects.toThrow(
      /Server selection timed out|ECONNREFUSED/,
    )
    await service.deconnecter()
  })
})

describe('commande de creation des index', () => {
  it('ne s execute pas a l import : le controle de chargement peut la couvrir', async () => {
    const module = await import('../src/commands/creer-index.ts')

    expect(typeof module.creerIndex).toBe('function')
    expect(import.meta.url).not.toBe(pathToFileURL(process.argv[1] ?? '.').href)
  })
})

// Ces cas exigent une base reelle. Sans `MONGODB_URI_TEST`, le fichier reste
// vert : `npm run test` ne doit pas dependre de Docker.
describe.skipIf(!URI_TEST)('index requis, sur une base reelle', () => {
  const service = new BaseDonneesService()
  const premier = INDEX_REQUIS[0]
  const collection = premier?.collection ?? ''
  const nomIndex = premier?.nom ?? ''

  async function supprimerIndexRequis(): Promise<void> {
    for (const requis of INDEX_REQUIS) {
      await mongoose.connection.db
        ?.collection(requis.collection)
        .dropIndex(requis.nom)
        .catch(() => undefined)
    }
  }

  beforeAll(async () => {
    await service.connecter(URI_TEST as string, 5_000)
  })

  afterAll(async () => {
    // Garde de nom : pointer MONGODB_URI_TEST sur une base reelle ne doit pas
    // la detruire.
    const nom = mongoose.connection.name ?? ''

    if (!/test/i.test(nom)) {
      throw new Error(`base « ${nom} » non reconnue comme base de test : abandon avant suppression`)
    }

    await mongoose.connection.dropDatabase()
    await service.deconnecter()
  })

  // Etat de depart connu : aucun document, aucun index requis. Les cas de
  // divergence creent deliberement un index errone du bon nom ; sans ce
  // nettoyage il survivrait au test et ferait echouer les suivants sur le
  // conflit d'options.
  beforeEach(async () => {
    for (const requis of INDEX_REQUIS) {
      await mongoose.connection.db?.collection(requis.collection).deleteMany({})
    }

    await supprimerIndexRequis()
  })

  it('signale un index requis absent en le nommant, puis passe apres creation', async () => {
    const avant = await service.verifierIndex()

    expect(avant).toHaveLength(INDEX_REQUIS.length)
    expect(avant.join(' ')).toContain('index requis absent')
    expect(avant.join(' ')).toContain(nomIndex)

    await service.creerIndex()

    expect(await service.verifierIndex()).toEqual([])
  })

  // C'est la branche qui justifie tout le changement : un index du bon nom mais
  // non unique laisserait l'unicite exister sur le papier seulement.
  it('signale un index du bon nom qui n est pas unique', async () => {
    await mongoose.connection.db
      ?.collection(collection)
      .createIndex(premier?.cles ?? {}, { name: nomIndex, unique: false })

    expect((await service.verifierIndex()).join(' ')).toContain('non unique')
  })

  it('signale un index du bon nom construit sur d autres cles', async () => {
    await mongoose.connection.db
      ?.collection(collection)
      .createIndex({ nomAffiche: 1 }, { name: nomIndex, unique: true })

    expect((await service.verifierIndex()).join(' ')).toContain('cles inattendues')
  })

  it('signale une unicite restreinte a un sous-ensemble des documents', async () => {
    await mongoose.connection.db?.collection(collection).createIndex(premier?.cles ?? {}, {
      name: nomIndex,
      unique: true,
      partialFilterExpression: { etat: 'actif' },
    })

    expect((await service.verifierIndex()).join(' ')).toContain('unicite restreinte')
  })

  it('se rejoue sans effet', async () => {
    await service.creerIndex()
    await service.creerIndex()

    expect(await service.verifierIndex()).toEqual([])
  })

  it('nomme le conflit quand un index du meme nom existe avec d autres options', async () => {
    await mongoose.connection.db
      ?.collection(collection)
      .createIndex({ nomAffiche: 1 }, { name: nomIndex })

    await expect(service.creerIndex()).rejects.toThrow(/supprimez-le puis rejouez/)
  })

  it('ne garde qu un document quand deux insertions concurrentes portent la meme adresse', async () => {
    await service.creerIndex()

    const modele = modeleUtilisateur()
    const resultats = await Promise.allSettled([
      modele.create({ nomAffiche: 'Alice', adresse: 'alice@ex.com' }),
      modele.create({ nomAffiche: 'Alice bis', adresse: 'alice@ex.com' }),
    ])

    const rejets = resultats.filter((resultat) => resultat.status === 'rejected')

    expect(rejets).toHaveLength(1)
    expect(String((rejets[0] as PromiseRejectedResult).reason)).toContain('11000')
    expect(await modele.countDocuments({ adresseNormalisee: 'alice@ex.com' })).toBe(1)
  })

  it('traite deux casses differentes comme une seule adresse', async () => {
    await service.creerIndex()

    const modele = modeleUtilisateur()

    await modele.create({ nomAffiche: 'Alice', adresse: 'Alice@Ex.COM ' })
    await expect(modele.create({ nomAffiche: 'Autre', adresse: 'alice@ex.com' })).rejects.toThrow()

    expect(await modele.countDocuments({})).toBe(1)
  })

  // Sans hook sur les chemins de mise a jour, l'index unique garderait une cle
  // qui ne correspond plus au document.
  it('renormalise la cle indexee quand l adresse change par mise a jour', async () => {
    await service.creerIndex()

    const modele = modeleUtilisateur()
    const cree = await modele.create({ nomAffiche: 'Alice', adresse: 'alice@ex.com' })

    await modele.updateOne({ _id: cree._id }, { $set: { adresse: 'Bob@Ex.COM ' } })

    expect((await modele.findById(cree._id))?.adresseNormalisee).toBe('bob@ex.com')
  })

  it(
    'demarre et repond sur son port quand les index requis sont en place',
    async () => {
      await service.creerIndex()

      const port = await portLibre()
      const enfant = lancer({ PORT: port, MONGODB_URI: URI_TEST as string })

      try {
        const lireStdout = await attendreDemarrage(enfant)
        const reponse = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
          signal: AbortSignal.timeout(5_000),
        })

        expect(reponse.status).toBe(200)
        expect(lireStdout()).toContain('base connectee, index requis verifies')
      } finally {
        enfant.kill()
        await once(enfant, 'exit')
      }
    },
    DELAI_PROCESS_MS,
  )

  // Les signaux POSIX ne sont pas emules sur Windows : `kill('SIGTERM')` y
  // termine le process sans declencher son gestionnaire.
  it.skipIf(process.platform === 'win32')(
    'ferme la connexion avant de sortir sur SIGTERM',
    async () => {
      await service.creerIndex()

      const enfant = lancer({ PORT: await portLibre(), MONGODB_URI: URI_TEST as string })
      const lireStdout = await attendreDemarrage(enfant)

      enfant.kill('SIGTERM')

      const [code] = (await once(enfant, 'exit')) as [number | null, string | null]

      expect(code).toBe(0)
      expect(lireStdout()).toContain('arret propre')
    },
    DELAI_PROCESS_MS,
  )

  it(
    'refuse de servir et nomme l index quand un index requis manque',
    async () => {
      const resultat = await lancerJusquAlaSortie({
        PORT: await portLibre(),
        MONGODB_URI: URI_TEST as string,
      })

      expect(resultat.code).not.toBe(0)
      expect(resultat.stderr).toContain(nomIndex)
      expect(resultat.stdout).not.toContain('api demarree')
    },
    DELAI_PROCESS_MS,
  )
})

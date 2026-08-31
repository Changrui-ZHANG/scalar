import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { once } from 'node:events'
import { pathToFileURL } from 'node:url'
import mongoose from 'mongoose'
import { SECRET_DE_TEST } from './aide-config.ts'
import {
  attendreDemarrage,
  DELAI_PROCESS_MS,
  lancer,
  lancerJusquAlaSortie,
  portLibre,
} from './aide-process.ts'
import { chargerConfig } from '../src/config/index.ts'
import { INDEX_REQUIS } from '@scalar/shared/index-requis.ts'
import { BaseDonneesService, masquerUri } from '../src/services/base-donnees.service.ts'
import { enregistrerModeles, modeleUser } from '../src/models/index.ts'
import { normaliserEmail } from '../src/models/user.model.ts'

// Ces cas portent sur la normalisation et sur les index, pas sur le hachage :
// une chaine quelconque suffit a satisfaire le champ requis, et hacher pour de
// vrai leur couterait 40 ms chacun sans rien prouver de plus.
const HACHAGE_FACTICE = '$argon2id$v=19$m=19456,t=2,p=1$factice$factice'

// Ces cas exigent une base reelle. Sans `MONGODB_URI_TEST`, le fichier reste
// vert : `npm run test` ne doit pas dependre de Docker.
const URI_TEST = process.env.MONGODB_URI_TEST

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
      const env = { MONGODB_URI: uri, SECRET_PSEUDONYMISATION: SECRET_DE_TEST }

      expect(chargerConfig(env as NodeJS.ProcessEnv).MONGODB_URI).toBe(uri)
    }
  })

  it('refuse de demarrer sans secret de pseudonymisation, en le nommant', () => {
    const env = { MONGODB_URI: 'mongodb://hote:27017/base' }

    expect(() => chargerConfig(env as NodeJS.ProcessEnv)).toThrow('exit:1')
    expect(erreurs.join(' ')).toContain('SECRET_PSEUDONYMISATION')
  })

  it('refuse un secret de pseudonymisation reste a sa valeur de remplissage', () => {
    const env = {
      MONGODB_URI: 'mongodb://hote:27017/base',
      SECRET_PSEUDONYMISATION: 'remplacez-moi-par-une-valeur-aleatoire-de-32-caracteres-minimum',
    }

    expect(() => chargerConfig(env as NodeJS.ProcessEnv)).toThrow('exit:1')
    expect(erreurs.join(' ')).toContain('SECRET_PSEUDONYMISATION')
  })

  it('refuse un secret de pseudonymisation trop court pour resister a une recherche', () => {
    const env = { MONGODB_URI: 'mongodb://hote:27017/base', SECRET_PSEUDONYMISATION: 'court' }

    expect(() => chargerConfig(env as NodeJS.ProcessEnv)).toThrow('exit:1')
    expect(erreurs.join(' ')).toContain('SECRET_PSEUDONYMISATION')
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
    expect(normaliserEmail('Alice@Ex.COM ')).toBe(normaliserEmail('alice@ex.com'))
  })

  it('rend identiques deux formes Unicode canoniquement equivalentes', () => {
    expect(normaliserEmail('ａlice@ex.com')).toBe(normaliserEmail('alice@ex.com'))
  })

  it('retire les caracteres de largeur nulle', () => {
    expect(normaliserEmail('alice​@ex.com')).toBe('alice@ex.com')
  })

  // Le hook relie la saisie a l'index unique : c'est le seul lien entre les
  // deux, et il se verifie sans connexion — la validation mongoose est locale.
  it('remplit le champ indexe a la validation du document', async () => {
    const document = new (modeleUser())({
      displayName: 'Alice',
      email: 'Alice@Ex.COM ',
      passwordHash: HACHAGE_FACTICE,
    })

    await document.validate()

    expect(document.normalizedEmail).toBe('alice@ex.com')
  })

  it('laisse la validation parler quand l adresse manque, sans lever de TypeError', async () => {
    const document = new (modeleUser())({ displayName: 'Alice' })

    await expect(document.validate()).rejects.toThrow(mongoose.Error.ValidationError)
  })
})

describe('registre de modeles', () => {
  it('reste sans effet quand il est rejoue, et ne garde qu un modele', () => {
    enregistrerModeles()
    const premier = modeleUser()

    expect(() => enregistrerModeles()).not.toThrow()
    expect(modeleUser()).toBe(premier)
    expect(Object.keys(mongoose.models).filter((nom) => nom === 'User')).toHaveLength(1)
  })

  it('refuse un nom deja pris par un autre schema', () => {
    mongoose.deleteModel('User')
    mongoose.model('User', new mongoose.Schema({ autre: String }))

    try {
      expect(() => enregistrerModeles()).toThrow('deja enregistre avec un autre schema')
    } finally {
      mongoose.deleteModel('User')
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
      .createIndex({ displayName: 1 }, { name: nomIndex, unique: true })

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
      .createIndex({ displayName: 1 }, { name: nomIndex })

    await expect(service.creerIndex()).rejects.toThrow(/supprimez-le puis rejouez/)
  })

  it('ne garde qu un document quand deux insertions concurrentes portent la meme adresse', async () => {
    await service.creerIndex()

    const modele = modeleUser()
    const resultats = await Promise.allSettled([
      modele.create({ displayName: 'Alice', email: 'alice@ex.com', passwordHash: HACHAGE_FACTICE }),
      modele.create({ displayName: 'Alice bis', email: 'alice@ex.com', passwordHash: HACHAGE_FACTICE }),
    ])

    const rejets = resultats.filter((resultat) => resultat.status === 'rejected')

    expect(rejets).toHaveLength(1)
    expect(String((rejets[0] as PromiseRejectedResult).reason)).toContain('11000')
    expect(await modele.countDocuments({ normalizedEmail: 'alice@ex.com' })).toBe(1)
  })

  it('traite deux casses differentes comme une seule adresse', async () => {
    await service.creerIndex()

    const modele = modeleUser()

    await modele.create({ displayName: 'Alice', email: 'Alice@Ex.COM ', passwordHash: HACHAGE_FACTICE })
    await expect(modele.create({ displayName: 'Autre', email: 'alice@ex.com', passwordHash: HACHAGE_FACTICE })).rejects.toThrow()

    expect(await modele.countDocuments({})).toBe(1)
  })

  // Sans hook sur les chemins de mise a jour, l'index unique garderait une cle
  // qui ne correspond plus au document.
  it('renormalise la cle indexee quand l adresse change par mise a jour', async () => {
    await service.creerIndex()

    const modele = modeleUser()
    const cree = await modele.create({
      displayName: 'Alice',
      email: 'alice@ex.com',
      passwordHash: HACHAGE_FACTICE,
    })

    await modele.updateOne({ _id: cree._id }, { $set: { email: 'Bob@Ex.COM ' } })

    expect((await modele.findById(cree._id))?.normalizedEmail).toBe('bob@ex.com')
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

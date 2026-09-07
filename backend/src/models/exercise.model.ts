import { Schema } from 'mongoose'
import {
  LONGUEUR_MAX_SLUG_EXERCICE,
  NOMBRE_MAX_TESTS_EXERCICE,
  OCTETS_MAX_TESTS_EXERCICE,
  STATUTS_EXERCICE,
  type StatutExercice,
} from '@scalar/shared/exercise.ts'

export const NOM_MODELE_EXERCISE = 'Exercise'
export const COLLECTION_EXERCISES = 'exercises'
export const VERSION_SCHEMA_EXERCISE = 1

// Statut de revue declare dans `shared` : reexporte ici parce que le modele
// est l'endroit ou l'on vient chercher la forme d'un `Exercise`.
export { STATUTS_EXERCICE, type StatutExercice }

// Un test embarque, jamais interroge seul (AD-8). Aucun comportement ici : la
// projection publique (AD-13, AD-21) vit dans `services/exercise.service.ts`,
// seul endroit qui decide quoi en montrer.
export interface TestExercise {
  name: string
  assertion: string
  code: string
  hidden: boolean
}

export interface Exercise {
  slug: string
  title: string
  statement: string
  starterCode: string
  language: string
  status: StatutExercice
  tests: TestExercise[]
  schemaVersion: number
}

const schemaTestExercise = new Schema<TestExercise>(
  {
    name: { type: String, required: true, trim: true },
    assertion: { type: String, required: true, trim: true },
    // `select: false` comme le hachage de mot de passe sur `User` : le filet
    // sous le contrat, pas le contrat lui-meme (AD-13). La projection publique
    // le selectionne explicitement pour les seuls tests visibles, jamais pour
    // construire une sortie generique.
    code: { type: String, required: true, select: false },
    hidden: { type: Boolean, required: true, default: false },
  },
  { _id: false },
)

// Taille serialisee du tableau de tests, en octets. Mesuree sur la forme
// stockee — apres troncature Mongoose des champs non declares — pour que la
// borne porte sur ce qui persiste reellement, pas sur une entree qui pourrait
// contenir des champs supplementaires silencieusement ignores.
function octetsDesTests(tests: readonly TestExercise[]): number {
  return Buffer.byteLength(
    JSON.stringify(
      tests.map((test) => ({
        name: test.name,
        assertion: test.assertion,
        code: test.code,
        hidden: test.hidden,
      })),
    ),
    'utf8',
  )
}

export const schemaExercise = new Schema<Exercise>(
  {
    // Meme borne que `schemaSlugExercice` cote route (AD-7) : sans elle, un
    // slug plus long que ce que la route accepte serait ecrit puis a jamais
    // injoignable par `GET /exercises/:slug`, le validateur du chemin le
    // refusant systematiquement.
    slug: { type: String, required: true, trim: true, maxlength: LONGUEUR_MAX_SLUG_EXERCICE },
    title: { type: String, required: true, trim: true },
    statement: { type: String, required: true },
    starterCode: { type: String, required: true },
    language: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: [...STATUTS_EXERCICE],
      default: 'draft',
    },
    // Borne en nombre **et** en octets (AD-8), imposee a l'ecrivain : un
    // document qui grossit jusqu'a la limite BSON bloquerait ensuite toute
    // ecriture, y compris une transition de statut.
    tests: {
      type: [schemaTestExercise],
      required: true,
      default: [],
      validate: {
        validator(tests: TestExercise[]): boolean {
          return (
            tests.length <= NOMBRE_MAX_TESTS_EXERCICE &&
            octetsDesTests(tests) <= OCTETS_MAX_TESTS_EXERCICE
          )
        },
        message: `Un Exercice porte au plus ${String(NOMBRE_MAX_TESTS_EXERCICE)} tests, pour un total de ${String(OCTETS_MAX_TESTS_EXERCICE)} octets (AD-8).`,
      },
    },
    schemaVersion: {
      type: Number,
      required: true,
      default: VERSION_SCHEMA_EXERCISE,
    },
  },
  {
    collection: COLLECTION_EXERCISES,
    // Aucun index ni collection cree implicitement : `creer-index` est le seul
    // chemin de creation, et le demarrage verifie le resultat.
    autoIndex: false,
    autoCreate: false,
    timestamps: true,
  },
)

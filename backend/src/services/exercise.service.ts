import type { HydratedDocument } from 'mongoose'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import type { ProjectionExercicePublique, TestCache, TestVisible } from '@scalar/shared/exercise.ts'
import { modeleExercise } from '../models/index.ts'
import type { Exercise } from '../models/exercise.model.ts'

// Traduit un document Mongoose en projection `publique` (AD-21). Aucun champ
// de cette projection ne varie selon l'appelant, et le corps d'un test cache
// n'y entre a aucun moment (AD-13) : il est simplement absent de l'objet
// construit pour `testsCaches`, jamais recu puis omis.
function versProjectionPublique(exercice: HydratedDocument<Exercise>): ProjectionExercicePublique {
  const testsVisibles: TestVisible[] = []
  const testsCaches: TestCache[] = []

  for (const test of exercice.tests) {
    if (test.hidden) {
      testsCaches.push({ name: test.name, assertion: test.assertion })
      continue
    }

    testsVisibles.push({
      name: test.name,
      assertion: test.assertion,
      code: test.code,
    })
  }

  return {
    id: exercice.id as string,
    slug: exercice.slug,
    title: exercice.title,
    statement: exercice.statement,
    starterCode: exercice.starterCode,
    language: exercice.language,
    testsVisibles,
    testsCaches,
    totalTests: exercice.tests.length,
    // Fige a `false` dans le perimetre de cette story : le calcul reel du
    // verrouillage freemium (FR-8) appartient au module `learning` et a son
    // projecteur (AD-6, AD-21).
    estVerrouille: false,
  }
}

// Proprietaire du module `exercises` cote apprenants. Un accesseur unique,
// immuablement filtre sur le contenu publie (AD-10) : aucune methode publique
// de ce service n'accepte de filtre de statut arbitraire.
export class ExerciseService {
  async trouverParSlugPublie(slug: string): Promise<ProjectionExercicePublique> {
    // `+tests.code` : le code des tests est exclu par defaut au niveau du
    // modele (AD-13, AD-21) ; il est reselectionne ici, explicitement, pour
    // que le projecteur puisse le porter sur les seuls tests visibles. Un
    // statut different de `published` n'est jamais lu par ce chemin : le
    // filtre est immuable, jamais parametre par l'appelant.
    const exercice = await modeleExercise()
      .findOne({ slug, status: 'published' })
      .select('+tests.code')

    if (!exercice) {
      throw new ErreurApi('EXERCICE_INTROUVABLE')
    }

    return versProjectionPublique(exercice)
  }
}

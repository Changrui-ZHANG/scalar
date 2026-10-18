import type { Chapter, ChapterLevel } from '../db/schema.ts'

/**
 * Donnees fictives des chapitres, en attendant la base.
 * Les `trackId` renvoient a `track.mock.ts` (1 JavaScript, 2 TypeScript,
 * 3 Conception). `position` est l'ordre dans le niveau.
 */

const DATE = new Date('2026-09-25T00:00:00Z')
const published = { status: 'published', firstPublishedAt: DATE } as const
const stamps = { createdAt: DATE, updatedAt: DATE }

/** Chapitre d'une seule lecon : il en reprend le titre et le resume. */
const chapter = (
  id: number,
  trackId: number,
  level: ChapterLevel,
  position: number,
  slug: string,
  title: string,
  summary: string,
): Chapter => ({ id, trackId, level, position, slug, title, summary, ...published, ...stamps })

export const MOCK_CHAPTERS: readonly Chapter[] = [
  // JavaScript, debutant
  chapter(
    6,
    1,
    'beginner',
    1,
    'syntaxe-et-nommage',
    'Syntaxe et nommage',
    'Instructions, commentaires, et comment bien nommer dès le premier jour.',
  ),
  {
    id: 1,
    trackId: 1,
    level: 'beginner',
    position: 2,
    slug: 'variables',
    title: 'Variables',
    summary:
      'Une variable nomme une valeur. `const` la fige, `let` permet de la réaffecter.\n\n```js\nconst prenom = "Ada"\nlet age = 36\nage = age + 1\n```',
    ...published,
    ...stamps,
  },
  {
    id: 2,
    trackId: 1,
    level: 'beginner',
    position: 3,
    slug: 'conditions',
    title: 'Conditions',
    summary:
      '`if` exécute un bloc seulement si sa condition est vraie ; `else` couvre le cas contraire.\n\n```js\nif (age >= 18) {\n  return "majeur"\n} else {\n  return "mineur"\n}\n```',
    ...published,
    ...stamps,
  },
  {
    id: 3,
    trackId: 1,
    level: 'beginner',
    position: 4,
    slug: 'boucles',
    title: 'Boucles',
    summary:
      '`for` répète un bloc tant que sa condition reste vraie.\n\n```js\nfor (let i = 1; i <= 3; i++) {\n  console.log(i)\n}\n```',
    ...published,
    ...stamps,
  },
  chapter(
    7,
    1,
    'beginner',
    5,
    'fonctions',
    'Fonctions',
    'Déclarer une fonction, ses paramètres et sa valeur de retour.',
  ),
  chapter(
    8,
    1,
    'beginner',
    6,
    'erreurs',
    'Gérer les erreurs',
    'Intercepter une erreur au lieu de laisser le programme s’arrêter.',
  ),
  chapter(
    9,
    1,
    'beginner',
    7,
    'classes',
    'Classes',
    'Regrouper des données et le comportement qui va avec.',
  ),

  // JavaScript, intermediaire
  chapter(
    10,
    1,
    'intermediate',
    1,
    'fonctions-flechees-et-closures',
    'Fonctions fléchées et closures',
    'Les fonctions anonymes de JavaScript, et ce qu’elles capturent.',
  ),
  chapter(
    11,
    1,
    'intermediate',
    2,
    'asynchrone',
    'Promesses et async / await',
    'Attendre un résultat sans bloquer le programme.',
  ),
  {
    ...chapter(12, 1, 'intermediate', 3, 'modules', 'Modules', 'Découper un programme en fichiers.'),
    status: 'draft',
    firstPublishedAt: null,
  },

  // JavaScript, avance
  chapter(
    13,
    1,
    'advanced',
    1,
    'prototypes',
    'Prototypes',
    'Ce que `class` cache : la chaîne de prototypes.',
  ),
  chapter(
    14,
    1,
    'advanced',
    2,
    'proxy-et-reflect',
    'Proxy et Reflect',
    'Inspecter et intercepter les opérations sur un objet.',
  ),

  // JavaScript, ecosysteme
  chapter(
    15,
    1,
    'ecosystem',
    1,
    'dotenv',
    'dotenv',
    'Charger les variables d’environnement depuis un fichier `.env`.',
  ),
  chapter(
    16,
    1,
    'ecosystem',
    2,
    'express',
    'Express',
    'Le framework web minimal le plus répandu de Node.js.',
  ),

  // TypeScript, debutant
  chapter(
    17,
    2,
    'beginner',
    1,
    'pourquoi-typer',
    'Pourquoi typer ?',
    'Ce que TypeScript ajoute à JavaScript, et ce qu’il ne change pas.',
  ),
  {
    id: 4,
    trackId: 2,
    level: 'beginner',
    position: 2,
    slug: 'types-de-base',
    title: 'Types de base',
    summary:
      'On annote une variable ou un paramètre avec `: type`. TypeScript vérifie ensuite que chaque valeur correspond.\n\n```ts\nfunction saluer(nom: string): string {\n  return "Bonjour " + nom\n}\n```',
    ...published,
    ...stamps,
  },

  // TypeScript, intermediaire
  {
    id: 5,
    trackId: 2,
    level: 'intermediate',
    position: 1,
    slug: 'generiques',
    title: 'Génériques',
    summary:
      'Un type générique `<T>` est un paramètre de type : la même fonction sert pour des nombres, des textes ou des objets, sans perdre la vérification.\n\n```ts\nfunction premier<T>(elements: T[]): T | undefined {\n  return elements[0]\n}\n```',
    ...published,
    ...stamps,
  },
  chapter(
    18,
    2,
    'intermediate',
    2,
    'unions-et-affinage',
    'Unions et affinage',
    'Une valeur qui peut avoir plusieurs types, et comment les distinguer.',
  ),

  // TypeScript, ecosysteme
  chapter(
    19,
    2,
    'ecosystem',
    1,
    'tsc-et-tsconfig',
    'tsc et tsconfig',
    'Vérifier les types d’un projet et régler le compilateur.',
  ),

  // Conception, debutant
  chapter(
    20,
    3,
    'beginner',
    1,
    'bases-de-la-conception',
    'Les bases de la conception',
    'Bien nommer, bien découper : les principes qui valent quel que soit le langage.',
  ),
]

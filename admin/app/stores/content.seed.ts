/** Jeu de depart de la base simulee : extrait des mocks du backend. */

export const SEED_LANGUAGES: readonly Language[] = [
  {
    id: 1,
    slug: 'javascript',
    position: 1,
    label: 'JavaScript',
    summary: 'Le point de départ : variables, conditions, boucles, fonctions.',
    runtime: 'node',
    status: 'published',
  },
  {
    id: 2,
    slug: 'typescript',
    position: 2,
    label: 'TypeScript',
    summary: 'JavaScript avec des types vérifiés. Suppose les bases de JavaScript.',
    runtime: 'node_strip_types',
    status: 'published',
  },
]

const chapter = (
  id: number,
  languageId: number,
  position: number,
  slug: string,
  title: string,
  summary: string,
): Chapter => ({ id, languageId, position, slug, title, summary, status: 'published' })

export const SEED_CHAPTERS: readonly Chapter[] = [
  chapter(1, 1, 1, 'variables', 'Variables', 'Nommer et stocker une valeur.'),
  chapter(2, 1, 2, 'conditions', 'Conditions', 'Choisir un chemin selon une valeur.'),
  chapter(3, 1, 3, 'boucles', 'Boucles', 'Répéter une instruction.'),
  chapter(4, 2, 1, 'types-de-base', 'Types de base', 'Annoter variables et fonctions.'),
  chapter(5, 2, 2, 'generiques', 'Génériques', 'Une fonction valable pour plusieurs types.'),
]

const visible = (args: unknown[], expected: unknown): TestCase => ({
  args,
  expected,
  label: '',
  isHidden: false,
})

export const SEED_EXERCISES: readonly Exercise[] = [
  {
    id: 1,
    chapterId: 1,
    slug: 'echanger-valeurs',
    position: 1,
    title: 'Échanger deux valeurs',
    statement:
      'Écris une fonction `swap(a, b)` qui renvoie un tableau contenant `b` puis `a`.\n\nExemple : `swap(1, 2)` renvoie `[2, 1]`.',
    functionName: 'swap',
    starterCode: 'function swap(a, b) {\n  // à toi de jouer\n}\n',
    solutionCode: 'function swap(a, b) {\n  return [b, a]\n}\n',
    hints: ['Un tableau s’écrit entre crochets : `[x, y]`.', 'Il suffit de renvoyer `[b, a]`.'],
    testCases: [
      visible([1, 2], [2, 1]),
      visible(['a', 'b'], ['b', 'a']),
      visible([null, 0], [0, null]),
    ],
    status: 'published',
  },
  {
    id: 2,
    chapterId: 1,
    slug: 'aire-rectangle',
    position: 2,
    title: 'Aire d’un rectangle',
    statement: 'Écris une fonction `area(width, height)` qui renvoie l’aire du rectangle.',
    functionName: 'area',
    starterCode: 'function area(width, height) {\n  \n}\n',
    solutionCode: 'function area(width, height) {\n  return width * height\n}\n',
    hints: ['L’aire est la largeur multipliée par la hauteur.'],
    testCases: [visible([2, 3], 6), visible([0, 5], 0)],
    status: 'published',
  },
]

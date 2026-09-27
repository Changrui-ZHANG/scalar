import type { Chapter, Exercise } from '../db/schema.ts'

/** Donnees fictives du parcours JavaScript, en attendant le seed de la base. */

const DATE = new Date('2026-09-25T00:00:00Z')
const stamps = { createdAt: DATE, updatedAt: DATE }

export const MOCK_CHAPTERS: readonly Chapter[] = [
  {
    id: 1,
    slug: 'variables',
    language: 'javascript',
    title: 'Variables',
    position: 1,
    lesson:
      'Une variable nomme une valeur. `const` la fige, `let` permet de la réaffecter.\n\n' +
      '```js\nconst prenom = "Ada"\nlet age = 36\nage = age + 1\n```',
    ...stamps,
  },
  {
    id: 2,
    slug: 'conditions',
    language: 'javascript',
    title: 'Conditions',
    position: 2,
    lesson:
      '`if` exécute un bloc seulement si sa condition est vraie ; `else` couvre le cas contraire.\n\n' +
      '```js\nif (age >= 18) {\n  return "majeur"\n} else {\n  return "mineur"\n}\n```',
    ...stamps,
  },
  {
    id: 3,
    slug: 'boucles',
    language: 'javascript',
    title: 'Boucles',
    position: 3,
    lesson:
      '`for` répète un bloc tant que sa condition reste vraie.\n\n' +
      '```js\nfor (let i = 1; i <= 3; i++) {\n  console.log(i)\n}\n```',
    ...stamps,
  },
]

export const MOCK_EXERCISES: readonly Exercise[] = [
  {
    id: 1,
    slug: 'echanger-valeurs',
    chapterId: 1,
    position: 1,
    title: 'Échanger deux valeurs',
    statement:
      'Écris une fonction `swap(a, b)` qui renvoie un tableau contenant `b` puis `a`.\n\n' +
      'Exemple : `swap(1, 2)` renvoie `[2, 1]`.',
    functionName: 'swap',
    starterCode: 'function swap(a, b) {\n  // à toi de jouer\n}\n',
    solution: 'function swap(a, b) {\n  return [b, a]\n}\n',
    hints: ['Un tableau s’écrit entre crochets : `[x, y]`.', 'Il suffit de renvoyer `[b, a]`.'],
    tests: [
      { args: [1, 2], expected: [2, 1] },
      { args: ['a', 'b'], expected: ['b', 'a'] },
      { args: [null, 0], expected: [0, null] },
    ],
    ...stamps,
  },
  {
    id: 2,
    slug: 'aire-rectangle',
    chapterId: 1,
    position: 2,
    title: 'Aire d’un rectangle',
    statement: 'Écris une fonction `area(width, height)` qui renvoie l’aire du rectangle.',
    functionName: 'area',
    starterCode: 'function area(width, height) {\n  \n}\n',
    solution: 'function area(width, height) {\n  return width * height\n}\n',
    hints: ['L’aire est la largeur multipliée par la hauteur.'],
    tests: [
      { args: [2, 3], expected: 6 },
      { args: [0, 5], expected: 0 },
      { args: [1.5, 2], expected: 3 },
    ],
    ...stamps,
  },
  {
    id: 3,
    slug: 'est-pair',
    chapterId: 2,
    position: 1,
    title: 'Pair ou impair',
    statement: 'Écris une fonction `isEven(n)` qui renvoie `true` si `n` est pair, `false` sinon.',
    functionName: 'isEven',
    starterCode: 'function isEven(n) {\n  \n}\n',
    solution: 'function isEven(n) {\n  return n % 2 === 0\n}\n',
    hints: [
      'L’opérateur `%` donne le reste d’une division.',
      'Un nombre pair a un reste de 0 quand on le divise par 2.',
    ],
    tests: [
      { args: [4], expected: true },
      { args: [7], expected: false },
      { args: [0], expected: true },
    ],
    ...stamps,
  },
  {
    id: 4,
    slug: 'plus-grand',
    chapterId: 2,
    position: 2,
    title: 'Le plus grand des deux',
    statement:
      'Écris une fonction `maxOfTwo(a, b)` qui renvoie le plus grand des deux nombres, ' +
      'sans utiliser `Math.max`.',
    functionName: 'maxOfTwo',
    starterCode: 'function maxOfTwo(a, b) {\n  \n}\n',
    solution: 'function maxOfTwo(a, b) {\n  if (a > b) {\n    return a\n  }\n  return b\n}\n',
    hints: [
      'Compare `a` et `b` avec `>`.',
      'Si les deux sont égaux, renvoyer l’un ou l’autre revient au même.',
    ],
    tests: [
      { args: [3, 9], expected: 9 },
      { args: [10, -2], expected: 10 },
      { args: [5, 5], expected: 5 },
    ],
    ...stamps,
  },
  {
    id: 5,
    slug: 'somme-jusqua',
    chapterId: 3,
    position: 1,
    title: 'Somme jusqu’à n',
    statement:
      'Écris une fonction `sumTo(n)` qui renvoie 1 + 2 + … + n. Pour `n = 0`, elle renvoie 0.',
    functionName: 'sumTo',
    starterCode: 'function sumTo(n) {\n  \n}\n',
    solution:
      'function sumTo(n) {\n  let total = 0\n  for (let i = 1; i <= n; i++) {\n    total += i\n  }\n  return total\n}\n',
    hints: ['Garde un total qui commence à 0.', 'Ajoute chaque `i` de 1 à `n` au total.'],
    tests: [
      { args: [3], expected: 6 },
      { args: [1], expected: 1 },
      { args: [0], expected: 0 },
      { args: [100], expected: 5050 },
    ],
    ...stamps,
  },
  {
    id: 6,
    slug: 'fizzbuzz',
    chapterId: 3,
    position: 2,
    title: 'FizzBuzz',
    statement:
      'Écris une fonction `fizzBuzz(n)` qui renvoie un tableau des nombres de 1 à `n`, où les ' +
      'multiples de 3 sont remplacés par `"Fizz"`, ceux de 5 par `"Buzz"`, et ceux de 3 et 5 par `"FizzBuzz"`.',
    functionName: 'fizzBuzz',
    starterCode: 'function fizzBuzz(n) {\n  const result = []\n  \n  return result\n}\n',
    solution:
      'function fizzBuzz(n) {\n  const result = []\n  for (let i = 1; i <= n; i++) {\n' +
      '    if (i % 15 === 0) result.push("FizzBuzz")\n    else if (i % 3 === 0) result.push("Fizz")\n' +
      '    else if (i % 5 === 0) result.push("Buzz")\n    else result.push(i)\n  }\n  return result\n}\n',
    hints: [
      'Teste d’abord le cas « multiple de 3 et de 5 ».',
      'Un multiple de 3 et de 5 est un multiple de 15.',
    ],
    tests: [
      { args: [5], expected: [1, 2, 'Fizz', 4, 'Buzz'] },
      {
        args: [15],
        expected: [1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz'],
      },
      { args: [0], expected: [] },
    ],
    ...stamps,
  },
]

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'

import { MOCK_QUESTIONNAIRES } from '../repositories/questionnaire.mock.ts'
import { QUESTIONNAIRE_EXERCISES } from '../repositories/questionnaire.tests.ts'
import type { ExecutionResult } from './execution.service.ts'
import type { SectionView } from './lesson.service.ts'
import {
  evaluateQuestionnaire,
  type EvaluatedQuestion,
} from './questionnaire-evaluation.service.ts'
import { buildHarness, readVerdict, type VerificationResult } from './verification.service.ts'

const MARKER = '__scalar_test__'

/** Une solution juste par exercice : les tests doivent l'accepter. */
const SOLUTIONS: Readonly<Record<string, string>> = {
  ajouter: 'function ajouter(a, b) { return a + b }',
  estPalindrome: 'function estPalindrome(s) { return s === [...s].reverse().join("") }',
  factorielle: 'function factorielle(n) { return n <= 1 ? 1 : n * factorielle(n - 1) }',
  estPair: 'function estPair(n) { return n % 2 === 0 }',
  dernierElement: 'function dernierElement(arr) { return arr[arr.length - 1] }',
  fibonacci:
    'function fibonacci(n) { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a }',
  maxOfTwo: 'function maxOfTwo(a, b) { return a > b ? a : b }',
  moyenne:
    'function moyenne(arr) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0 }',
  trierCroissant: 'function trierCroissant(arr) { return [...arr].sort((a, b) => a - b) }',
  compterVoyelles: 'function compterVoyelles(s) { return (s.match(/[aeiou]/gi) ?? []).length }',
  inverserChaine: 'function inverserChaine(s) { return [...s].reverse().join("") }',
  pairsJusquaN:
    'function pairsJusquaN(n) { const r = []; for (let i = 0; i <= n; i += 2) r.push(i); return r }',
  enSecondes: 'function enSecondes(h, m, s) { return h * 3600 + m * 60 + s }',
  contientDoublons: 'function contientDoublons(arr) { return new Set(arr).size !== arr.length }',
  pgcd: 'function pgcd(a, b) { return b === 0 ? a : pgcd(b, a % b) }',
}

/** Fait tourner le harnais dans un vrai Node, comme le ferait Piston. */
function verify(functionName: string, code: string): VerificationResult {
  const cases = QUESTIONNAIRE_EXERCISES[functionName]!.cases
  const run = spawnSync(process.execPath, ['-e', buildHarness(code, functionName, cases, MARKER)], {
    encoding: 'utf8',
  })
  const execution: ExecutionResult = {
    status: run.status === 0 ? 'OK' : 'RE',
    label: run.status === 0 ? 'Terminé' : 'Erreur d’exécution',
    run: {
      stdout: run.stdout,
      stderr: run.stderr,
      output: run.stdout + run.stderr,
      code: run.status,
      signal: null,
      status: run.status === 0 ? null : 'RE',
    },
  }
  return readVerdict(execution, functionName, cases, MARKER)
}

const codeQuestions = MOCK_QUESTIONNAIRES.flatMap((q) => q.questions).filter(
  (q) => q.type === 'code',
) as unknown as (EvaluatedQuestion & { placeholder: string })[]

describe('tests unitaires du questionnaire', () => {
  it('chaque exercice de code a ses tests', () => {
    for (const question of codeQuestions) {
      assert.ok(
        question.functionName && QUESTIONNAIRE_EXERCISES[question.functionName],
        `${question.title} : aucun test pour ${question.functionName}`,
      )
    }
  })

  for (const [name, solution] of Object.entries(SOLUTIONS)) {
    it(`${name} : la solution passe, le code de départ échoue`, () => {
      assert.equal(verify(name, solution).passed, true)
      const starter = codeQuestions.find((q) => q.functionName === name)!.placeholder
      assert.equal(verify(name, starter).passed, false)
    })
  }
})

// --- Evaluation ----------------------------------------------------------------

const QUESTIONS: readonly EvaluatedQuestion[] = [
  {
    id: 1,
    position: 1,
    type: 'theoretical',
    title: 'Expérience',
    options: ['Débutant absolu', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
  },
  {
    id: 2,
    position: 2,
    type: 'language-selection',
    title: 'Langages',
    options: ['JavaScript', 'TypeScript', 'Python'],
  },
  { id: 3, position: 3, type: 'theoretical', title: 'Motivations', options: [] },
  {
    id: 7,
    position: 7,
    type: 'theoretical',
    title: 'Équipe',
    options: ['Jamais', 'Un peu', 'Souvent', 'Grandes équipes'],
  },
  { id: 8, position: 8, type: 'code', title: 'Somme', functionName: 'ajouter' },
  { id: 9, position: 9, type: 'code', title: 'Palindrome', functionName: 'estPalindrome' },
  { id: 10, position: 10, type: 'code', title: 'Factorielle', functionName: 'factorielle' },
]

const SECTION: SectionView = {
  kind: 'language',
  slug: 'javascript',
  label: 'JavaScript',
  groups: [
    {
      slug: 'debutant',
      label: 'Débutant',
      lessons: [
        { slug: 'conditions', title: 'Conditions', summary: '', number: 1 },
        { slug: 'boucles', title: 'Boucles', summary: '', number: 2 },
        { slug: 'fonctions', title: 'Fonctions', summary: '', number: 3 },
      ],
    },
    {
      slug: 'intermediaire',
      label: 'Intermédiaire',
      lessons: [{ slug: 'async-await', title: 'async/await', summary: '', number: 1 }],
    },
    {
      slug: 'avance',
      label: 'Avancé',
      lessons: [{ slug: 'prototypes', title: 'Prototypes', summary: '', number: 1 }],
    },
  ],
}

const WRONG: Readonly<Record<string, string>> = {
  ajouter: 'function ajouter() { throw new Error("à faire") }',
  estPalindrome: 'function estPalindrome() { throw new Error("à faire") }',
  factorielle: 'function factorielle() { return 0 }',
}

function evaluate(answers: Record<string, string | string[]>, solved: readonly string[]) {
  const verifications = new Map(
    QUESTIONS.filter((q) => q.type === 'code').map((q) => {
      const name = q.functionName!
      return [String(q.id), verify(name, solved.includes(name) ? SOLUTIONS[name]! : WRONG[name]!)]
    }),
  )
  return evaluateQuestionnaire({
    questions: QUESTIONS,
    answers,
    verifications,
    section: async (slug) => (slug === 'javascript' ? SECTION : { ...SECTION, slug, label: 'TypeScript' }),
  })
}

describe('évaluation du questionnaire', () => {
  it('tout réussi avec de l’expérience : niveau avancé', async () => {
    const result = await evaluate(
      { 1: 'Expert', 2: ['JavaScript'], 7: 'Grandes équipes' },
      ['ajouter', 'estPalindrome', 'factorielle'],
    )
    assert.equal(result.level.slug, 'avance')
    assert.equal(result.practical.score, 100)
    assert.equal(result.score, 100)
    assert.equal(result.recommendations.lessons[0]?.slug, 'prototypes')
    assert.equal(result.recommendations.start.url, '/parcours/javascript/lecon/prototypes')
  })

  it('une auto-évaluation que les exercices démentent : débutant, et on le dit', async () => {
    const result = await evaluate({ 1: 'Expert', 7: 'Grandes équipes' }, [])
    assert.equal(result.level.slug, 'debutant')
    assert.equal(result.practical.score, 0)
    assert.ok(result.feedback.some((f) => f.includes('plus avancé que ne le montrent')))
    assert.equal(result.recommendations.start.url, '/parcours/javascript')
  })

  it('détaille les tests échoués et recommande les cours correspondants', async () => {
    const result = await evaluate({ 1: 'Intermédiaire' }, ['ajouter', 'estPalindrome'])
    const factorielle = result.practical.exercises.find((e) => e.functionName === 'factorielle')!
    assert.equal(factorielle.passed, false)
    assert.equal(factorielle.passedCases, 0)
    assert.ok(factorielle.failures.some((f) => f.detail === 'Obtenu : 0'))
    const reasons = result.recommendations.lessons.filter((l) => l.reason.includes('Factorielle'))
    assert.deepEqual(
      reasons.map((l) => l.slug),
      ['boucles', 'fonctions'],
    )
  })

  it('pondère les exercices par difficulté', async () => {
    const easy = await evaluate({}, ['ajouter'])
    const hard = await evaluate({}, ['factorielle'])
    assert.ok(hard.practical.score > easy.practical.score)
  })

  it('lit la réponse libre et signale les langages non proposés', async () => {
    const short = await evaluate({ 2: ['Python'], 3: 'Pour voir' }, [])
    assert.ok(short.feedback.some((f) => f.includes('très courte')))
    assert.ok(short.feedback.some((f) => f.startsWith('Python')))
    assert.equal(short.recommendations.language.slug, 'javascript')

    const career = await evaluate({ 3: 'Je prépare une reconversion vers un métier du web' }, [])
    assert.ok(career.feedback.some((f) => f.startsWith('Objectif professionnel')))
  })

  it('TypeScript seul : proposé à qui a les bases, JavaScript d’abord pour un débutant', async () => {
    const all = ['ajouter', 'estPalindrome', 'factorielle']
    const confirmed = await evaluate({ 1: 'Avancé', 2: ['TypeScript'] }, all)
    assert.equal(confirmed.recommendations.language.slug, 'typescript')

    const beginner = await evaluate({ 1: 'Débutant absolu', 2: ['TypeScript'] }, [])
    assert.equal(beginner.recommendations.language.slug, 'javascript')
  })
})

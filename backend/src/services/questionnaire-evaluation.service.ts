/**
 * Correction et evaluation du questionnaire de positionnement.
 *
 * Les exercices sont corriges comme ceux des parcours : le code tourne dans
 * Piston suivi du harnais, les valeurs renvoyees sont comparees ici. Au moment
 * de terminer, tout est recorrige cote serveur : le niveau propose ne repose
 * jamais sur un verdict envoye par le navigateur.
 */
import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import { findQuestionnaireExercise } from '../repositories/questionnaire.tests.ts'
import { executeCode, MAX_CODE_BYTES } from './execution.service.ts'
import type { LessonService, SectionView } from './lesson.service.ts'
import { buildHarness, readVerdict, type VerificationResult } from './verification.service.ts'

// --- Entrees -------------------------------------------------------------------

const codeField = z
  .string('Le champ « code » doit être une chaîne de caractères.')
  .refine(
    (code) => Buffer.byteLength(code, 'utf8') <= MAX_CODE_BYTES,
    `Le code soumis dépasse la limite de ${MAX_CODE_BYTES} octets.`,
  )

export const verificationSchema = z.object({
  functionName: z.string('Le champ « functionName » est requis.').min(1),
  code: codeField.refine((code) => code.trim() !== '', 'Le code soumis est vide.'),
})

export const resultsSchema = z.object({
  questionnaireId: z.coerce.number('Le champ « questionnaireId » est requis.').int(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
  submissions: z
    .array(
      z.object({
        questionId: z.union([z.number(), z.string()]).transform(String),
        functionName: z.string().min(1),
        code: codeField,
      }),
    )
    .max(10)
    .default([]),
})

export type ResultsInput = z.infer<typeof resultsSchema>

/** Question telle que l'evaluation la lit, quelle que soit la source. */
export interface EvaluatedQuestion {
  readonly id: number | string
  readonly position: number
  readonly type: string
  readonly title: string
  readonly options?: readonly string[] | null
  readonly functionName?: string | null
}

// --- Sorties -------------------------------------------------------------------

export type LevelSlug = 'debutant' | 'intermediaire' | 'avance'

export interface ExerciseOutcome {
  readonly questionId: string
  readonly title: string
  readonly functionName: string
  readonly difficulty: string
  /** Cas de test reussis, hors criteres « s'execute » et « est definie ». */
  readonly passedCases: number
  readonly totalCases: number
  readonly passed: boolean
  readonly failures: readonly { readonly label: string; readonly detail: string | null }[]
}

export interface DeclaredAnswer {
  readonly question: string
  readonly answer: string
}

export interface RecommendedLesson {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly category: string
  readonly url: string
  readonly reason: string
}

export interface QuestionnaireEvaluation {
  readonly score: number
  readonly level: { readonly slug: LevelSlug; readonly label: string; readonly description: string }
  readonly declared: { readonly score: number; readonly answers: readonly DeclaredAnswer[] }
  readonly practical: { readonly score: number; readonly exercises: readonly ExerciseOutcome[] }
  readonly feedback: readonly string[]
  readonly recommendations: {
    readonly language: { readonly slug: string; readonly label: string }
    readonly start: { readonly label: string; readonly url: string }
    readonly lessons: readonly RecommendedLesson[]
  }
}

// --- Correction ----------------------------------------------------------------

/** Corrige `code` contre les tests de l'exercice ; null si l'exercice est inconnu. */
export async function verifyQuestionnaireCode(
  functionName: string,
  code: string,
): Promise<VerificationResult | null> {
  const exercise = findQuestionnaireExercise(functionName)
  if (!exercise) {
    return null
  }
  const marker = `__scalar_${randomUUID()}__`
  const execution = await executeCode(buildHarness(code, functionName, exercise.cases, marker))
  return readVerdict(execution, functionName, exercise.cases, marker)
}

// --- Evaluation ----------------------------------------------------------------

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile'] as const

const LEVELS: Readonly<Record<LevelSlug, { label: string; description: string }>> = {
  debutant: {
    label: 'Débutant',
    description:
      'Vous partez des fondations : syntaxe, variables, conditions, boucles et fonctions.',
  },
  intermediaire: {
    label: 'Intermédiaire',
    description:
      'Les bases sont là : vous pouvez aborder les fonctions avancées et l’asynchrone.',
  },
  avance: {
    label: 'Avancé',
    description:
      'Vous maîtrisez l’essentiel : place aux mécanismes du langage et à son écosystème.',
  },
}

/** Langages proposes par Scalar, par libelle de la question de selection. */
const AVAILABLE_LANGUAGES: Readonly<Record<string, string>> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
}

const TEXT_KEYWORDS: readonly { readonly words: RegExp; readonly note: string }[] = [
  {
    words: /carri[eè]re|reconversion|emploi|travail|m[ée]tier|job/i,
    note: 'Objectif professionnel : le parcours met l’accent sur les pratiques attendues en entreprise.',
  },
  {
    words: /projet|cr[ée]er|application|site|startup|entreprise/i,
    note: 'Vous voulez construire : chaque chapitre se termine par des exercices concrets.',
  },
  {
    words: /jeu|game/i,
    note: 'Les jeux demandent de bonnes bases en boucles et en logique : ne les négligez pas.',
  },
]

const ratio = (index: number, length: number): number =>
  length > 1 && index >= 0 ? index / (length - 1) : 0

const answerText = (answer: string | readonly string[] | undefined): string =>
  Array.isArray(answer) ? answer.join(', ') : ((answer as string | undefined) ?? '').trim()

function toOutcome(
  question: EvaluatedQuestion,
  rank: number,
  verification: VerificationResult | null,
): ExerciseOutcome {
  const functionName = question.functionName ?? ''
  const base = {
    questionId: String(question.id),
    title: question.title,
    functionName,
    difficulty: DIFFICULTIES[Math.min(rank, DIFFICULTIES.length - 1)]!,
  }
  if (!verification) {
    const total = findQuestionnaireExercise(functionName)?.cases.length ?? 0
    return {
      ...base,
      passedCases: 0,
      totalCases: total,
      passed: false,
      failures: [{ label: 'Aucun code soumis', detail: null }],
    }
  }
  // Les deux premiers criteres disent si le code tourne ; les suivants sont les cas.
  const cases = verification.checks.slice(2)
  return {
    ...base,
    passedCases: cases.filter((c) => c.passed).length,
    totalCases: cases.length,
    passed: verification.passed,
    failures: verification.checks
      .filter((c) => !c.passed)
      .map((c) => ({ label: c.label, detail: c.detail })),
  }
}

function pickLevel(score: number, practical: number): LevelSlug {
  // L'exercice facile echoue : quelle que soit l'auto-evaluation, on consolide.
  if (practical < 0.2) {
    return 'debutant'
  }
  if (score < 40) {
    return 'debutant'
  }
  return score < 75 ? 'intermediaire' : 'avance'
}

function pickLanguage(selected: readonly string[], level: LevelSlug): string {
  const available = selected.map((s) => AVAILABLE_LANGUAGES[s]).filter(Boolean)
  // TypeScript suppose JavaScript : un debutant commence par le second.
  if (available.includes('typescript') && !available.includes('javascript') && level !== 'debutant') {
    return 'typescript'
  }
  return 'javascript'
}

function recommendLessons(
  section: SectionView | null,
  languageSlug: string,
  level: LevelSlug,
  exercises: readonly ExerciseOutcome[],
  exerciseLessons: (functionName: string) => readonly string[],
): RecommendedLesson[] {
  if (!section) {
    return []
  }
  const all = section.groups.flatMap((g) =>
    g.lessons.map((l) => ({ ...l, category: g.label, categorySlug: g.slug })),
  )
  const picked = new Map<string, RecommendedLesson>()
  const add = (slug: string, reason: string) => {
    const lesson = all.find((l) => l.slug === slug)
    if (lesson && !picked.has(slug)) {
      picked.set(slug, {
        slug,
        title: lesson.title,
        summary: lesson.summary,
        category: lesson.category,
        url: `/parcours/${languageSlug}/lecon/${slug}`,
        reason,
      })
    }
  }

  // D'abord ce que les exercices ont montre fragile.
  for (const exercise of exercises.filter((e) => !e.passed)) {
    for (const slug of exerciseLessons(exercise.functionName)) {
      add(slug, `À revoir : l’exercice « ${exercise.title} » n’est pas validé.`)
    }
  }
  // Puis le programme du niveau propose.
  for (const lesson of all.filter((l) => l.categorySlug === level)) {
    add(lesson.slug, `Au programme du niveau ${LEVELS[level].label}.`)
  }
  return [...picked.values()].slice(0, 6)
}

export interface EvaluationInput {
  readonly questions: readonly EvaluatedQuestion[]
  readonly answers: ResultsInput['answers']
  /** Verdict par identifiant de question de code ; absent si rien n'a ete soumis. */
  readonly verifications: ReadonlyMap<string, VerificationResult>
  readonly section: (languageSlug: string) => Promise<SectionView | null>
  readonly exerciseLessons?: (functionName: string) => readonly string[]
}

/** Calcule l'evaluation ; pure, hors chargement des lecons recommandees. */
export async function evaluateQuestionnaire(input: EvaluationInput): Promise<QuestionnaireEvaluation> {
  const exerciseLessons =
    input.exerciseLessons ??
    ((name: string) => findQuestionnaireExercise(name)?.lessons ?? [])
  const questions = input.questions.toSorted((a, b) => a.position - b.position)
  const codeQuestions = questions.filter((q) => q.type === 'code')
  const otherQuestions = questions.filter((q) => q.type !== 'code')
  const answerOf = (q: EvaluatedQuestion) => input.answers[String(q.id)]

  // Pratique : chaque exercice pese selon sa difficulte (1, 2, 3), au prorata des cas reussis.
  const exercises = codeQuestions.map((q, i) =>
    toOutcome(q, i, input.verifications.get(String(q.id)) ?? null),
  )
  const weights = exercises.map((_, i) => i + 1)
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const practical =
    weightSum === 0
      ? 0
      : exercises.reduce(
          (sum, e, i) => sum + weights[i]! * (e.totalCases ? e.passedCases / e.totalCases : 0),
          0,
        ) / weightSum

  // Declaratif : experience (position 1) et travail en equipe (position 7).
  const position = (p: number) => otherQuestions.find((q) => q.position === p)
  const choiceRatio = (q: EvaluatedQuestion | undefined) => {
    if (!q?.options?.length) {
      return 0
    }
    return ratio(q.options.indexOf(answerText(answerOf(q))), q.options.length)
  }
  const declared = 0.75 * choiceRatio(position(1)) + 0.25 * choiceRatio(position(7))

  const score = Math.round(100 * (0.3 * declared + 0.7 * practical))
  const level = pickLevel(score, practical)

  const feedback: string[] = []
  if (declared - practical > 0.35) {
    feedback.push(
      'Vous vous estimez plus avancé que ne le montrent les exercices : le parcours commence par consolider les bases.',
    )
  } else if (practical - declared > 0.35) {
    feedback.push(
      'Vos exercices en montrent plus que votre auto-évaluation : vous pouvez démarrer plus loin que prévu.',
    )
  }
  const solved = exercises.filter((e) => e.passed).length
  feedback.push(
    solved === exercises.length && exercises.length > 0
      ? 'Tous les exercices sont validés par leurs tests unitaires.'
      : `${solved} exercice${solved > 1 ? 's' : ''} sur ${exercises.length} entièrement validé${solved > 1 ? 's' : ''} par les tests unitaires.`,
  )

  // Reponses libres : une motivation explicite aide a tenir sur la duree.
  for (const q of otherQuestions.filter((q) => !q.options?.length)) {
    const text = answerText(answerOf(q))
    const words = text.split(/\s+/).filter(Boolean).length
    if (words < 5) {
      feedback.push(
        'Votre réponse sur vos motivations est très courte : un objectif précis aide à tenir sur la durée.',
      )
      continue
    }
    for (const { words: pattern, note } of TEXT_KEYWORDS) {
      if (pattern.test(text)) {
        feedback.push(note)
      }
    }
  }

  const languageQuestion = otherQuestions.find((q) => q.type === 'language-selection')
  const selected = languageQuestion ? [answerOf(languageQuestion) ?? []].flat() : []
  const unavailable = selected.filter((s) => !(s in AVAILABLE_LANGUAGES))
  if (unavailable.length > 0) {
    feedback.push(
      `${unavailable.join(', ')} : pas encore proposé sur Scalar. Vous commencez par JavaScript, dont les notions se transposent.`,
    )
  }
  const languageSlug = pickLanguage(selected, level)
  if (selected.includes('TypeScript') && languageSlug === 'javascript') {
    feedback.push('TypeScript s’appuie sur JavaScript : commencez par lui, TypeScript suivra.')
  }

  const section = await input.section(languageSlug)
  const lessons = recommendLessons(section, languageSlug, level, exercises, exerciseLessons)
  const firstOfLevel = lessons.find((l) => l.category === LEVELS[level].label)

  return {
    score,
    level: { slug: level, ...LEVELS[level] },
    declared: {
      score: Math.round(100 * declared),
      answers: otherQuestions.map((q) => ({
        question: q.title,
        answer: answerText(answerOf(q)) || 'Sans réponse',
      })),
    },
    practical: { score: Math.round(100 * practical), exercises },
    feedback,
    recommendations: {
      language: { slug: languageSlug, label: section?.label ?? languageSlug },
      start:
        level === 'debutant' || !firstOfLevel
          ? { label: `Commencer le parcours ${section?.label ?? ''}`.trim(), url: `/parcours/${languageSlug}` }
          : { label: `Commencer par « ${firstOfLevel.title} »`, url: firstOfLevel.url },
      lessons,
    },
  }
}

/** Corrige les soumissions puis evalue ; `lessons` fournit les cours a recommander. */
export async function evaluateSubmission(
  questions: readonly EvaluatedQuestion[],
  input: ResultsInput,
  lessons: Pick<LessonService, 'getSection'>,
): Promise<QuestionnaireEvaluation> {
  // La base ne stocke pas le nom de fonction : a defaut, celui du navigateur.
  const named = questions.map((q) => {
    const submitted = input.submissions.find((s) => s.questionId === String(q.id))
    return q.type === 'code' && !q.functionName && submitted
      ? { ...q, functionName: submitted.functionName }
      : q
  })
  const known = new Map(
    named.filter((q) => q.type === 'code').map((q) => [String(q.id), q] as const),
  )
  const verifications = new Map<string, VerificationResult>()
  // Une a une : le moteur partage sa capacite entre tous les apprenants.
  for (const submission of input.submissions) {
    const question = known.get(submission.questionId)
    if (!question || submission.code.trim() === '') {
      continue
    }
    const verdict = await verifyQuestionnaireCode(question.functionName ?? '', submission.code)
    if (verdict) {
      verifications.set(submission.questionId, verdict)
    }
  }
  return evaluateQuestionnaire({
    questions: named,
    answers: input.answers,
    verifications,
    section: (slug) => lessons.getSection(slug),
  })
}

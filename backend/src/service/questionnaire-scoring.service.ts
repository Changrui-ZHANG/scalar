// Calcul pur : aucune lecture, aucun appel au moteur. Les exercices arrivent deja corriges par le serveur.

import type { ChapterLevel } from '@scalar/shared/enums'

import {
  QUESTIONNAIRE_PRACTICAL_FLOOR,
  QUESTIONNAIRE_SELF_ASSESSMENT_GAP,
  QUESTIONNAIRE_THRESHOLDS,
  QUESTIONNAIRE_WEIGHTS,
} from '../constants.ts'
import type { QuestionnaireOption } from '../entity/questionnaire-option.entity.ts'
import type { QuestionnaireQuestion } from '../entity/questionnaire-question.entity.ts'
import type { VerificationResult } from './verification.service.ts'

export type PlacementLevel = Exclude<ChapterLevel, 'ecosystem'>

export interface ExerciseScore {
  readonly passedCases: number
  readonly totalCases: number
}

export interface QuestionnaireAnswers {
  /** Option choisie, par identifiant de question. */
  readonly choices: ReadonlyMap<number, number>
  /** Verdict du serveur, par identifiant de question de code ; absent si rien n'a ete soumis. */
  readonly exercises: ReadonlyMap<number, ExerciseScore>
}

export interface ScoringInput {
  readonly questions: readonly QuestionnaireQuestion[]
  readonly options: readonly QuestionnaireOption[]
  readonly answers: QuestionnaireAnswers
  /** Parcours a suivre avant `trackSlug`, ou null. */
  readonly prerequisiteOf?: (trackSlug: string) => string | null
}

export interface QuestionnaireScore {
  /** Sur 100, comme les trois sous-scores. */
  readonly score: number
  readonly level: PlacementLevel
  readonly declared: number
  readonly knowledge: number
  readonly practical: number
  readonly trackSlug: string | null
  readonly feedback: readonly string[]
}

// Les deux premiers criteres disent si le code tourne et si la fonction existe : seuls les suivants sont des cas.
export function toExerciseScore(result: VerificationResult): ExerciseScore {
  const cases = result.checks.slice(2)
  return { passedCases: cases.filter((c) => c.passed).length, totalCases: cases.length }
}

const weightedMean = (items: readonly { readonly weight: number; readonly value: number }[]) => {
  const total = items.reduce((sum, i) => sum + i.weight, 0)
  return total === 0 ? 0 : items.reduce((sum, i) => sum + i.weight * i.value, 0) / total
}

const percent = (ratio: number): number => Math.round(100 * ratio)

function pickLevel(score: number, practical: number): PlacementLevel {
  if (practical < QUESTIONNAIRE_PRACTICAL_FLOOR || score < QUESTIONNAIRE_THRESHOLDS.intermediate) {
    return 'beginner'
  }
  return score < QUESTIONNAIRE_THRESHOLDS.advanced ? 'intermediate' : 'advanced'
}

export function scoreQuestionnaire(input: ScoringInput): QuestionnaireScore {
  const { questions, options, answers } = input
  const ofKind = (kind: QuestionnaireQuestion['kind']) => questions.filter((q) => q.kind === kind)

  // Une option d'une autre question vaut une absence de reponse.
  const chosen = (question: QuestionnaireQuestion): QuestionnaireOption | undefined => {
    const optionId = answers.choices.get(question.id)
    return options.find((o) => o.id === optionId && o.questionId === question.id)
  }
  const choiceScore = (q: QuestionnaireQuestion) => ({
    weight: q.weight,
    value: chosen(q)?.score ?? 0,
  })

  const declared = weightedMean(ofKind('experience').map(choiceScore))
  const knowledge = weightedMean(ofKind('knowledge').map(choiceScore))
  const practical = weightedMean(
    ofKind('code').map((q) => {
      const result = answers.exercises.get(q.id)
      return {
        weight: q.weight,
        value: result && result.totalCases > 0 ? result.passedCases / result.totalCases : 0,
      }
    }),
  )

  const score = percent(
    QUESTIONNAIRE_WEIGHTS.declared * declared +
      QUESTIONNAIRE_WEIGHTS.knowledge * knowledge +
      QUESTIONNAIRE_WEIGHTS.practical * practical,
  )
  const level = pickLevel(score, practical)

  const feedback: string[] = []
  if (declared - practical > QUESTIONNAIRE_SELF_ASSESSMENT_GAP) {
    feedback.push(
      'Vous vous estimez plus avancé que ne le montrent les exercices : le parcours commence par consolider les bases.',
    )
  } else if (practical - declared > QUESTIONNAIRE_SELF_ASSESSMENT_GAP) {
    feedback.push(
      'Vos exercices en montrent plus que votre auto-évaluation : vous pouvez démarrer plus loin que prévu.',
    )
  }

  const languageQuestion = ofKind('language')[0]
  const languageOptions = options
    .filter((o) => o.questionId === languageQuestion?.id && o.trackSlug !== null)
    .toSorted((a, b) => a.position - b.position)
  const wanted =
    (languageQuestion && chosen(languageQuestion)?.trackSlug) ??
    languageOptions[0]?.trackSlug ??
    null
  const prerequisite = wanted && level === 'beginner' ? input.prerequisiteOf?.(wanted) : null
  if (prerequisite) {
    feedback.push(
      'Ce parcours suppose des bases que le questionnaire n’a pas montrées : commencez par son prérequis.',
    )
  }

  return {
    score,
    level,
    declared: percent(declared),
    knowledge: percent(knowledge),
    practical: percent(practical),
    trackSlug: prerequisite ?? wanted,
    feedback,
  }
}

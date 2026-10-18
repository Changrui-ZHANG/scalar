import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QuestionnaireResults from '../app/components/QuestionnaireResults.vue'

const EVALUATION: QuestionnaireEvaluation = {
  score: 48,
  level: { slug: 'intermediaire', label: 'Intermédiaire', description: 'Les bases sont là.' },
  declared: {
    score: 45,
    answers: [{ question: 'Pourquoi apprendre ?', answer: 'Changer de carrière' }],
  },
  practical: {
    score: 50,
    exercises: [
      {
        questionId: '8',
        title: 'Somme de deux nombres',
        functionName: 'ajouter',
        difficulty: 'Facile',
        passedCases: 4,
        totalCases: 4,
        passed: true,
        failures: [],
      },
      {
        questionId: '10',
        title: 'Factorielle',
        functionName: 'factorielle',
        difficulty: 'Difficile',
        passedCases: 1,
        totalCases: 4,
        passed: false,
        failures: [{ label: 'factorielle(5) renvoie 120', detail: 'Obtenu : 10' }],
      },
    ],
  },
  feedback: ['1 exercice sur 2 entièrement validé par les tests unitaires.'],
  recommendations: {
    language: { slug: 'javascript', label: 'JavaScript' },
    start: { label: 'Commencer par « async/await »', url: '/parcours/javascript/lecon/async-await' },
    lessons: [
      {
        slug: 'boucles',
        title: 'Boucles',
        summary: '`for` et `while`',
        category: 'Débutant',
        url: '/parcours/javascript/lecon/boucles',
        reason: 'À revoir : l’exercice « Factorielle » n’est pas validé.',
      },
    ],
  },
}

describe('QuestionnaireResults', () => {
  it('affiche le niveau, les tests échoués et les cours recommandés', async () => {
    const page = await mountSuspended(QuestionnaireResults, { props: { evaluation: EVALUATION } })

    expect(page.find('h2').text()).toBe('Niveau proposé : Intermédiaire')
    expect(page.text()).toContain('48 %')
    expect(page.text()).toContain('× Non validé')
    expect(page.text()).toContain('Obtenu : 10')
    expect(page.text()).toContain('Changer de carrière')
    expect(page.find('a[href="/parcours/javascript/lecon/boucles"]').text()).toContain('Boucles')
    expect(page.find('a[href="/parcours/javascript/lecon/async-await"]').exists()).toBe(true)
  })

  it('propose de refaire le questionnaire', async () => {
    const page = await mountSuspended(QuestionnaireResults, { props: { evaluation: EVALUATION } })
    await page.findAll('button').find((b) => b.text().includes('Refaire'))!.trigger('click')
    expect(page.emitted('restart')).toHaveLength(1)
  })
})

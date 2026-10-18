import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Demarrer from '../../app/pages/demarrer.vue'

const QUESTIONNAIRE = {
  id: 7,
  questions: [
    {
      id: 2,
      type: 'language-selection',
      title: 'Quels langages voulez-vous apprendre ?',
      options: ['JavaScript', 'Python'],
    },
    {
      id: 1,
      type: 'theoretical',
      title: 'Évaluez votre expérience',
      description: 'Choisissez une réponse.',
      options: ['Débutant', 'Confirmé'],
    },
    {
      id: 3,
      type: 'text',
      title: 'Pourquoi apprendre ?',
    },
  ],
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

async function mountPage() {
  const page = await mountSuspended(Demarrer)
  await flushPromises()
  return page
}

function buttonByText(page: Awaited<ReturnType<typeof mountPage>>, text: string) {
  return page.findAll('button').find((b) => b.text().includes(text))
}

describe('page demarrer', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: QUESTIONNAIRE }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('affiche le titre de la page', async () => {
    const page = await mountPage()
    expect(page.text()).toContain('Questionnaire de démarrage')
  })

  it('charge le questionnaire et affiche le titre de la première question', async () => {
    const page = await mountPage()

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/questionnaires/random')
    expect(page.find('h2').text()).toBe('Quels langages voulez-vous apprendre ?')
    expect(page.text()).toContain('Étape 1 sur 3')
    expect(page.text()).toContain('33 %')
  })

  it('n’affiche aucun toast fantôme au chargement', async () => {
    const page = await mountPage()
    expect(page.findAll('[role="status"]')).toHaveLength(0)
  })

  it('garde la navigation dans le conteneur de la page', async () => {
    const page = await mountPage()
    const next = buttonByText(page, 'Étape suivante')

    expect(next).toBeDefined()
    expect(page.element.contains(next!.element)).toBe(true)
  })

  it('numérote les questions par étape, pas par identifiant', async () => {
    const page = await mountPage()
    expect(page.text()).toContain('Question 1')
    expect(page.text()).not.toContain('Question 2')
  })

  it('coche et décoche plusieurs langages', async () => {
    const page = await mountPage()
    const [js, python] = page.findAll('input[type="checkbox"]')

    await js!.trigger('change')
    await python!.trigger('change')
    expect(js!.element.closest('label')?.className).toContain('border-brand')
    expect(python!.element.closest('label')?.className).toContain('border-brand')

    await js!.trigger('change')
    expect(js!.element.closest('label')?.className).not.toContain('border-brand')
  })

  it('passe d’une étape à l’autre', async () => {
    const page = await mountPage()
    expect(buttonByText(page, 'Étape précédente')).toBeUndefined()

    await buttonByText(page, 'Étape suivante')!.trigger('click')
    expect(page.find('h2').text()).toBe('Évaluez votre expérience')
    expect(page.findAll('input[type="radio"]')).toHaveLength(2)

    await buttonByText(page, 'Étape précédente')!.trigger('click')
    expect(page.find('h2').text()).toBe('Quels langages voulez-vous apprendre ?')
  })

  it('propose de terminer à la dernière étape', async () => {
    const page = await mountPage()
    await buttonByText(page, 'Étape suivante')!.trigger('click')
    await buttonByText(page, 'Étape suivante')!.trigger('click')

    expect(page.find('textarea').exists()).toBe(true)
    expect(buttonByText(page, 'Étape suivante')).toBeUndefined()
    expect(buttonByText(page, 'Terminer le questionnaire')).toBeDefined()
  })

  it('signale l’échec du chargement par un toast que l’on peut fermer', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const page = await mountPage()

    expect(page.text()).toContain('Aucune question disponible')
    expect(buttonByText(page, 'Étape suivante')).toBeUndefined()
    const toasts = page.findAll('[role="status"]')
    expect(toasts).toHaveLength(1)
    expect(toasts[0]!.text()).toContain('Impossible de charger le questionnaire')

    await page.find('button[aria-label="Fermer la notification"]').trigger('click')
    expect(page.findAll('[role="status"]')).toHaveLength(0)
  })
})

const EVALUATION = {
  score: 20,
  level: { slug: 'debutant', label: 'Débutant', description: 'Les fondations.' },
  declared: { score: 0, answers: [] },
  practical: { score: 25, exercises: [] },
  feedback: [],
  recommendations: {
    language: { slug: 'javascript', label: 'JavaScript' },
    start: { label: 'Commencer le parcours JavaScript', url: '/parcours/javascript' },
    lessons: [],
  },
}

const CODE_QUESTIONNAIRE = {
  id: 1,
  questions: [
    {
      id: 8,
      type: 'code',
      title: 'Somme de deux nombres',
      functionName: 'ajouter',
      placeholder: 'function ajouter(a, b) {\n  // Votre code\n}',
      example: '// ajouter(2, 3) devrait retourner 5',
    },
  ],
}

const FAILED_VERIFICATION = {
  passed: false,
  passedCount: 2,
  total: 3,
  checks: [
    { label: 'Le programme s’exécute', passed: true, detail: null },
    { label: 'La fonction ajouter est définie', passed: true, detail: null },
    { label: 'ajouter(2, 3) renvoie 5', passed: false, detail: 'Obtenu : null' },
  ],
  execution: { status: 'OK', label: 'Terminé', run: { stdout: '', stderr: '', code: 0, signal: null } },
}


describe('page demarrer : exercices de code', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/v1/questionnaire-verifications') {
        return jsonResponse({ data: FAILED_VERIFICATION })
      }
      if (url === '/api/v1/questionnaire-results') {
        return jsonResponse({ data: EVALUATION })
      }
      return jsonResponse({ data: CODE_QUESTIONNAIRE })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('part du code de départ et rappelle qu’aucun console.log n’est requis', async () => {
    const page = await mountPage()
    expect((page.find('textarea').element as HTMLTextAreaElement).value).toContain('function ajouter')
    expect(page.text()).toContain('console.log')
    expect(page.text()).toContain('ajouter(2, 3) devrait retourner 5')
  })

  it('lance les tests unitaires et montre ceux qui échouent', async () => {
    const page = await mountPage()
    await buttonByText(page, 'Lancer les tests')!.trigger('click')
    await flushPromises()

    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/v1/questionnaire-verifications')!
    expect(JSON.parse(init.body)).toMatchObject({ functionName: 'ajouter' })
    expect(page.text()).toContain('2 tests réussis sur 3')
    expect(page.text()).toContain('Obtenu : null')
  })

  it('envoie le code de chaque exercice puis affiche les résultats sur la même page', async () => {
    const page = await mountPage()
    await page.find('textarea').setValue('function ajouter(a, b) { return a + b }')
    await buttonByText(page, 'Terminer le questionnaire')!.trigger('click')
    await flushPromises()

    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/v1/questionnaire-results')!
    expect(JSON.parse(init.body).submissions).toEqual([
      { questionId: 8, functionName: 'ajouter', code: 'function ajouter(a, b) { return a + b }' },
    ])
    expect(page.text()).toContain('Niveau proposé : Débutant')
    expect(page.find('textarea').exists()).toBe(false)
    expect(buttonByText(page, 'Terminer le questionnaire')).toBeUndefined()

    await buttonByText(page, 'Refaire le questionnaire')!.trigger('click')
    await flushPromises()
    expect(page.text()).not.toContain('Niveau proposé')
    expect(page.find('h2').text()).toBe('Somme de deux nombres')
  })
})

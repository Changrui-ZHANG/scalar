import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TrackView } from '@scalar/shared/api'
import TrackCertificate from '../../../../../frontend/app/components/track/TrackCertificate.vue'
import * as certificates from '../../../../../frontend/app/services/certificates'
import * as learners from '../../../../../frontend/app/services/learners'
import { useAuthStore } from '../../../../../frontend/app/stores/auth'

const track: TrackView = {
  track: {
    slug: 'javascript',
    name: 'JavaScript',
    summary: 'Le langage du Web.',
    programmingLanguage: 'javascript',
    prerequisite: null,
  },
  chapters: [
    {
      slug: 'variables',
      title: 'Variables',
      summary: '',
      level: 'beginner',
      number: 1,
      free: true,
      lessons: [],
      exercises: [{ slug: 'swap', title: 'Échanger', instructions: '' }],
    },
  ],
}

const allDone = new Set(['exercise:variables:swap'])
const noProgress = { passedCount: 1, exercises: [], lessons: [], certificates: [] }
const issued = {
  code: 'XTXFK-66RQ2',
  holderName: 'Ada Lovelace',
  track: { slug: 'javascript', name: 'JavaScript' },
  issuedAt: '2026-11-26T19:31:53Z',
}

function signIn() {
  const auth = useAuthStore()
  auth.account = { id: 'a1', email: 'ada@example.com', role: 'learner' }
  auth.loaded = true
}

describe('TrackCertificate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore().account = null
  })

  it('ne s’affiche pas tant qu’un exercice reste à réussir', async () => {
    signIn()
    const card = await mountSuspended(TrackCertificate, { props: { track, completed: new Set() } })

    expect(card.text()).toBe('')
  })

  it('délivre le certificat avec le nom saisi, puis montre son lien', async () => {
    signIn()
    vi.spyOn(learners, 'fetchLearnerProgress').mockResolvedValue(noProgress)
    const issue = vi.spyOn(certificates, 'issueCertificate').mockResolvedValueOnce(issued)
    const card = await mountSuspended(TrackCertificate, { props: { track, completed: allDone } })
    await flushPromises()

    await card.find('input[name="holderName"]').setValue('  Ada Lovelace ')
    await card.find('form').trigger('submit')
    await flushPromises()

    expect(issue).toHaveBeenCalledWith('a1', 'javascript', 'Ada Lovelace')
    expect(card.find('a[href="/certificats/XTXFK-66RQ2"]').exists()).toBe(true)
  })

  it('propose l’offre quand le serveur exige Premium', async () => {
    signIn()
    vi.spyOn(learners, 'fetchLearnerProgress').mockResolvedValue(noProgress)
    vi.spyOn(certificates, 'issueCertificate').mockRejectedValueOnce({
      statusCode: 403,
      data: { error: 'Contenu réservé aux abonnés Premium.' },
    })
    const card = await mountSuspended(TrackCertificate, { props: { track, completed: allDone } })
    await flushPromises()

    await card.find('input[name="holderName"]').setValue('Ada')
    await card.find('form').trigger('submit')
    await flushPromises()

    expect(card.find('[role="alert"]').text()).toContain('Contenu réservé aux abonnés Premium.')
    expect(card.find('a[href="/premium"]').exists()).toBe(true)
  })

  it('montre directement un certificat déjà délivré', async () => {
    signIn()
    vi.spyOn(learners, 'fetchLearnerProgress').mockResolvedValue({
      ...noProgress,
      certificates: [issued],
    })
    const card = await mountSuspended(TrackCertificate, { props: { track, completed: allDone } })
    await flushPromises()

    expect(card.text()).toContain('Délivré à Ada Lovelace')
    expect(card.find('form').exists()).toBe(false)
  })
})

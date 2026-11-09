import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'

import ExerciseForm from '../app/components/ExerciseForm.vue'
import type { ExerciseInput } from '../app/utils/schemas'

const INITIAL: ExerciseInput = {
  title: '',
  slug: '',
  statement: '',
  functionName: '',
  starterCode: '',
  solutionCode: '',
  hints: '',
  testCases: [{ args: '[]', expected: '', label: '', isHidden: false }],
  status: 'draft',
}

const mountForm = (editing: boolean) =>
  mountSuspended(ExerciseForm, {
    props: {
      initial: INITIAL,
      save: vi.fn(),
      submitLabel: 'Enregistrer',
      cancelTo: '/parcours',
      codeLanguage: 'javascript',
      editing,
    },
  })

describe('ExerciseForm', () => {
  it('ne propose pas de statut à la création : l’exercice naît brouillon', async () => {
    const wrapper = await mountForm(false)

    expect(wrapper.text()).not.toContain('Statut')
  })

  it('propose publication et archivage en édition', async () => {
    const wrapper = await mountForm(true)

    expect(wrapper.text()).toContain('Publié')
    expect(wrapper.text()).toContain('Archivé')
  })
})

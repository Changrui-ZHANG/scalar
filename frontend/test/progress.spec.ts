import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import {
  EMPTY_PROGRESS,
  completeEpisode,
  parseProgress,
  startTrack,
} from '../app/composables/useProgress'
import RichText from '../app/components/RichText.vue'

describe('parseProgress', () => {
  it('relit une progression bien formée', () => {
    const raw = JSON.stringify({
      started: ['javascript'],
      completed: { javascript: ['lesson:conditions:decision'] },
    })
    expect(parseProgress(raw)).toEqual({
      started: ['javascript'],
      completed: { javascript: ['lesson:conditions:decision'] },
    })
  })

  it('ignore un stockage absent, corrompu ou d’une autre forme', () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS)
    expect(parseProgress('{pas du json')).toEqual(EMPTY_PROGRESS)
    expect(parseProgress('[1,2]')).toEqual(EMPTY_PROGRESS)
    expect(parseProgress('"texte"')).toEqual(EMPTY_PROGRESS)
  })

  it('écarte les entrées mal formées sans perdre les autres', () => {
    const raw = JSON.stringify({
      started: 'javascript',
      completed: { javascript: ['lesson:bases:x'], typescript: 'oops', python: [1] },
    })
    expect(parseProgress(raw)).toEqual({
      started: [],
      completed: { javascript: ['lesson:bases:x'] },
    })
  })
})

describe('progression par parcours', () => {
  it('commencer TypeScript ne touche pas à JavaScript', () => {
    const js = completeEpisode(EMPTY_PROGRESS, 'javascript', 'lesson:conditions:decision')
    const both = startTrack(js, 'typescript')

    expect(both.started).toEqual(['javascript', 'typescript'])
    expect(both.completed).toEqual({ javascript: ['lesson:conditions:decision'] })
  })

  it('terminer un épisode est idempotent et ne modifie pas l’état d’origine', () => {
    const once = completeEpisode(EMPTY_PROGRESS, 'javascript', 'exercise:conditions:est-pair')
    const twice = completeEpisode(once, 'javascript', 'exercise:conditions:est-pair')

    expect(twice).toEqual(once)
    expect(EMPTY_PROGRESS).toEqual({ started: [], completed: {} })
  })
})

describe('RichText', () => {
  it('rend les blocs de code, les paragraphes et le code en ligne', async () => {
    const source = 'Écris `swap(a, b)`.\n\n```js\nconst x = 1\n```\n\nFin.'
    const wrapper = await mountSuspended(RichText, { props: { source } })

    expect(wrapper.findAll('p')).toHaveLength(2)
    expect(wrapper.find('p code').text()).toBe('swap(a, b)')
    expect(wrapper.find('pre').text()).toBe('const x = 1')
  })

  it('rend les titres et les listes des cours', async () => {
    const source = '## Les types\n\n- `string` : du texte\n- `number`\n\nFin.'
    const wrapper = await mountSuspended(RichText, { props: { source } })

    expect(wrapper.find('h3').text()).toBe('Les types')
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.find('li code').text()).toBe('string')
    expect(wrapper.findAll('p')).toHaveLength(1)
  })

  it('n’interprète jamais le HTML du contenu', async () => {
    const wrapper = await mountSuspended(RichText, {
      props: { source: '<img src=x onerror="alert(1)">' },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img')
  })
})

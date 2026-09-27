import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mergeStatus, parseProgress } from '../app/composables/useProgress'
import RichText from '../app/components/RichText.vue'

describe('parseProgress', () => {
  it('relit une progression bien formée', () => {
    const raw = JSON.stringify({ swap: { status: 'attempted', code: 'x' } })
    expect(parseProgress(raw)).toEqual({ swap: { status: 'attempted', code: 'x' } })
  })

  it('ignore un stockage absent, corrompu ou d’une autre forme', () => {
    expect(parseProgress(null)).toEqual({})
    expect(parseProgress('{pas du json')).toEqual({})
    expect(parseProgress('[1,2]')).toEqual({})
    expect(parseProgress('"texte"')).toEqual({})
  })

  it('écarte les entrées mal formées sans perdre les autres', () => {
    const raw = JSON.stringify({
      ok: { status: 'passed', code: 'x' },
      statutInconnu: { status: 'hacked', code: 'x' },
      sansCode: { status: 'started' },
      nul: null,
    })
    expect(Object.keys(parseProgress(raw))).toEqual(['ok'])
  })
})

describe('mergeStatus', () => {
  it('fait progresser un exercice', () => {
    expect(mergeStatus('todo', 'started')).toBe('started')
    expect(mergeStatus('started', 'attempted')).toBe('attempted')
  })

  it('ne rétrograde jamais un exercice', () => {
    expect(mergeStatus('passed', 'started')).toBe('passed')
    expect(mergeStatus('attempted', 'started')).toBe('attempted')
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

  it('n’interprète jamais le HTML du contenu', async () => {
    const wrapper = await mountSuspended(RichText, {
      props: { source: '<img src=x onerror="alert(1)">' },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img')
  })
})

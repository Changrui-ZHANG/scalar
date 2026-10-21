import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import ContentCodeBlock from '../../packages/ui/components/content/ContentCodeBlock.vue'
import ContentRichText from '../../packages/ui/components/content/ContentRichText.vue'
import UiCodeEditor from '../../packages/ui/components/ui/UiCodeEditor.vue'

describe('ContentCodeBlock', () => {
  it('affiche les numéros de ligne et le libellé du langage', async () => {
    const wrapper = await mountSuspended(ContentCodeBlock, {
      props: {
        code: 'const a = 1\nconst b = 2',
        language: 'javascript',
        lines: null,
        tryable: true,
      },
    })

    expect(wrapper.text()).toContain('JavaScript')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('const a = 1')
    expect(wrapper.text()).toContain('Essayer dans le bac à sable')
  })

  it('masque le bouton Essayer si tryable est faux ou langage nul', async () => {
    const wrapper = await mountSuspended(ContentCodeBlock, {
      props: {
        code: 'plain text',
        language: null,
        lines: null,
        tryable: false,
      },
    })

    expect(wrapper.text()).not.toContain('Essayer dans le bac à sable')
  })

  it('émet try au clic sur Essayer dans le bac à sable', async () => {
    const wrapper = await mountSuspended(ContentCodeBlock, {
      props: {
        code: 'const a = 1',
        language: 'javascript',
        lines: null,
        tryable: true,
      },
    })

    const tryBtn = wrapper.findAll('button').find((b) => b.text().includes('Essayer'))
    expect(tryBtn).toBeDefined()
    await tryBtn!.trigger('click')
    expect(wrapper.emitted('try')).toHaveLength(1)
  })

  it('copie le code au clic sur Copier', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })

    const wrapper = await mountSuspended(ContentCodeBlock, {
      props: {
        code: 'console.log("hello")',
        language: 'javascript',
        lines: null,
      },
    })

    const copyBtn = wrapper.findAll('button').find((b) => b.text().includes('Copier'))
    expect(copyBtn).toBeDefined()
    await copyBtn!.trigger('click')

    expect(writeTextMock).toHaveBeenCalledWith('console.log("hello")')
  })
})

describe('ContentRichText', () => {
  it('rend le Markdown en HTML riche sans v-html (intertitres, listes, code)', async () => {
    const source = `
## Introduction

Voici une liste :
- Premier point avec \`code inline\`
- Deuxième point

\`\`\`javascript
const answer = 42
\`\`\`
`
    const wrapper = await mountSuspended(ContentRichText, {
      props: {
        source,
        language: 'javascript',
        tryable: true,
      },
    })

    expect(wrapper.classes()).toContain('content-prose')

    const h2 = wrapper.find('h2#introduction')
    expect(h2.exists()).toBe(true)
    expect(h2.text()).toBe('Introduction')

    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.find('code').text()).toContain('code inline')

    expect(wrapper.text()).toContain('JavaScript')
    expect(wrapper.text()).toContain('const answer = 42')
  })

  it('relaie l’événement try émis par un bloc de code', async () => {
    const source = `
\`\`\`typescript
const isDone: boolean = true
\`\`\`
`
    const wrapper = await mountSuspended(ContentRichText, {
      props: {
        source,
        language: 'typescript',
        tryable: true,
      },
    })

    const tryBtn = wrapper.findAll('button').find((b) => b.text().includes('Essayer'))
    expect(tryBtn).toBeDefined()
    await tryBtn!.trigger('click')

    expect(wrapper.emitted('try')).toBeDefined()
    expect(wrapper.emitted('try')![0]).toEqual([
      'const isDone: boolean = true',
      'typescript',
    ])
  })
})

describe('UiCodeEditor', () => {
  it('monte le composant et expose les méthodes de manipulation', async () => {
    const wrapper = await mountSuspended(UiCodeEditor, {
      props: {
        modelValue: 'let count = 0',
        language: 'javascript',
      },
    })

    expect(wrapper.text()).toContain('let count = 0')
    expect(wrapper.vm.insertAtCursor).toBeTypeOf('function')
    expect(wrapper.vm.wrapSelection).toBeTypeOf('function')
  })
})

// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// Nuxt ne l'affiche que sous ce nom exact, dans `app/`.
const readTemplate = () =>
  readFileSync(resolve(import.meta.dirname, '../app/spa-loading-template.html'), 'utf8')

describe('écran de premier chargement', () => {
  it('annonce le chargement, y compris aux lecteurs d’écran', () => {
    const html = readTemplate()

    expect(html).toContain('role="status"')
    expect(html).toContain('Chargement')
  })

  it('suit le thème sombre et respecte la réduction des animations', () => {
    const html = readTemplate()

    expect(html).toContain('prefers-color-scheme: dark')
    expect(html).toContain('prefers-reduced-motion')
  })

  it('ne dépend d’aucune ressource externe : le réseau est justement lent', () => {
    expect(readTemplate()).not.toMatch(/(?:src|href)=|url\(|@import/)
  })
})

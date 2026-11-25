import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))

const git = (...args: string[]) => spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' })

describe('secrets hors de Git', () => {
  it.each(['.env', 'backend/.env', 'frontend/.env', 'admin/.env', '.env.production'])(
    '%s est ignoré',
    (file) => {
      expect(git('check-ignore', '-q', file).status).toBe(0)
    },
  )

  it('aucun fichier .env n’est suivi, hors modèles .example', () => {
    const tracked = git('ls-files')
      .stdout.split('\n')
      .filter((file) => /(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.example'))

    expect(tracked).toEqual([])
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as executionsService from '~/services/executions'
import { useSandbox, useTryInSandbox } from './useSandbox'

describe('composables/useSandbox', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('initialise la langue et le code par défaut', () => {
    const sandbox = useSandbox()
    expect(sandbox.language.value).toBe('javascript')
    expect(sandbox.code.value).toBe('')
    expect(sandbox.pending.value).toBe(false)
  })

  it('exécute le code et met à jour le résultat', async () => {
    vi.spyOn(executionsService, 'executeCode').mockResolvedValueOnce({
      status: 'OK',
      label: 'OK',
      run: { stdout: '42\n', stderr: '', output: '42\n', code: 0, signal: null, wall_time: 10 },
    })

    const sandbox = useSandbox()
    sandbox.code.value = 'console.log(42)'
    await sandbox.run()

    expect(sandbox.result.value?.run.stdout).toBe('42\n')
    expect(sandbox.error.value).toBeNull()
  })

  it('bloque les codes dépassant 64 Kio', async () => {
    const sandbox = useSandbox()
    sandbox.code.value = 'a'.repeat(64 * 1024 + 1)
    await sandbox.run()

    expect(sandbox.error.value).toBe('Votre code dépasse 64 Kio.')
    expect(sandbox.result.value).toBeNull()
  })

  it('ouvre un exemple de code dans le bac à sable via sessionStorage', async () => {
    const tryCode = useTryInSandbox()
    await tryCode('const x = 10', 'javascript')
    const raw = sessionStorage.getItem('scalar:sandbox-seed:v1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toEqual({ code: 'const x = 10', language: 'javascript' })
  })
})

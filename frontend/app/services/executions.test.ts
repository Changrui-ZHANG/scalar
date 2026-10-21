import { describe, expect, it, vi } from 'vitest'
import * as api from './api'
import { executeCode } from './executions'

describe('services/executions', () => {
  it('appelle /executions avec POST et timeout 20s', async () => {
    const apiFetchSpy = vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({
      status: 'OK',
      label: 'OK',
      run: { stdout: 'hello\n', stderr: '', output: 'hello\n', code: 0, signal: null, wall_time: 15 },
    })

    const result = await executeCode({
      code: "console.log('hello')",
      programmingLanguage: 'javascript',
    })

    expect(apiFetchSpy).toHaveBeenCalledWith('/executions', {
      method: 'POST',
      body: {
        code: "console.log('hello')",
        programmingLanguage: 'javascript',
      },
      timeout: 20_000,
    })
    expect(result.status).toBe('OK')
    expect(result.run.stdout).toBe('hello\n')
  })
})

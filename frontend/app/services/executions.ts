import type { ExecutionRequest, ExecutionResult } from '@scalar/shared/api'
import { apiFetch } from './api'

export function executeCode(body: ExecutionRequest): Promise<ExecutionResult> {
  return apiFetch<ExecutionResult>('/executions', {
    method: 'POST',
    body: body as unknown as Record<string, unknown>,
    timeout: 20_000,
  })
}

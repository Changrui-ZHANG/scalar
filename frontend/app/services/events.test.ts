import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendEvent } from './events'

describe('services/events', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { apiBase: '/api/v1' },
    }))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('sends POST /api/v1/events with keepalive and json payload', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response())
    globalThis.fetch = fetchMock

    sendEvent({
      type: 'lesson_completed',
      track: 'javascript',
      chapter: 'conditions',
      slug: 'decision',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/events', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'lesson_completed',
        track: 'javascript',
        chapter: 'conditions',
        slug: 'decision',
      }),
    })
  })

  it('swallows errors without throwing', () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))
    globalThis.fetch = fetchMock

    expect(() => {
      sendEvent({
        type: 'chapter_completed',
        track: 'javascript',
        chapter: 'conditions',
      })
    }).not.toThrow()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '../../app/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ajoute un toast avec un identifiant', () => {
    const { toasts, show } = useToast()
    show({ title: 'Bonjour', variant: 'success' })

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ title: 'Bonjour', variant: 'success' })
    expect(toasts.value[0]?.id).toBeTruthy()
  })

  it('ferme un toast précis sans toucher aux autres', () => {
    const { toasts, show, dismiss } = useToast()
    show({ title: 'Premier', variant: 'default' })
    show({ title: 'Second', variant: 'destructive' })

    dismiss(toasts.value[0]!.id)
    expect(toasts.value.map((t) => t.title)).toEqual(['Second'])
  })

  it('retire un toast automatiquement après 5 secondes', () => {
    const { toasts, show } = useToast()
    show({ title: 'Éphémère', variant: 'default' })

    vi.advanceTimersByTime(4999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })
})

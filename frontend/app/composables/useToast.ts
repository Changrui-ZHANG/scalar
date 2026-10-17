import { ref } from 'vue'

interface Toast {
  id: string
  title: string
  description?: string
  variant: 'default' | 'destructive' | 'success'
}

export function useToast() {
  const toasts = ref<Toast[]>([])

  function show(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substring(2, 9)
    toasts.value.push({
      id,
      ...toast
    })

    // Supprimer automatiquement le toast après 5 secondes
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 5000)
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    show,
    dismiss
  }
}
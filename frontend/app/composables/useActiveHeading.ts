import { nextTick, onMounted, onUnmounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

export function useActiveHeading(ids: MaybeRefOrGetter<readonly string[]>): {
  readonly activeId: Ref<string | null>
  scrollTo(id: string): void
} {
  const activeId = ref<string | null>(null)
  let observer: IntersectionObserver | null = null

  function updateObserver() {
    if (!import.meta.client || typeof IntersectionObserver === 'undefined') return
    if (observer) {
      observer.disconnect()
      observer = null
    }

    const currentIds = toValue(ids)
    if (!currentIds || currentIds.length === 0) {
      activeId.value = null
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        // Trouve la première section visible qui intersecte avec le haut
        const visible = entries.find((e) => e.isIntersecting)
        if (visible && visible.target.id) {
          activeId.value = visible.target.id
        }
      },
      {
        rootMargin: '0px 0px -70% 0px',
        threshold: 0,
      },
    )

    for (const id of currentIds) {
      const el = document.getElementById(id)
      if (el) {
        observer.observe(el)
      }
    }
  }

  onMounted(() => {
    nextTick(() => {
      updateObserver()
      const currentIds = toValue(ids)
      if (currentIds.length > 0 && !activeId.value) {
        activeId.value = currentIds[0] ?? null
      }
    })
  })

  watch(
    () => toValue(ids),
    () => {
      nextTick(updateObserver)
    },
    { deep: true },
  )

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  })

  function scrollTo(id: string): void {
    activeId.value = id
    if (import.meta.client && typeof document !== 'undefined') {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return {
    activeId,
    scrollTo,
  }
}

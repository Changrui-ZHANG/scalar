<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { SEARCH_KIND_ICONS, SEARCH_MIN_LENGTH } from '~/utils/search'
import type { SearchResult } from '~/types/search'

const search = useSearch()
const { query, results, groups, status, open, load } = search

const inputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(0)

const flatResults = computed<readonly SearchResult[]>(() =>
  groups.value.flatMap((g) => g.results),
)

const activeOptionId = computed(() =>
  flatResults.value.length > 0 && activeIndex.value >= 0
    ? `search-option-${activeIndex.value}`
    : undefined,
)

watch(flatResults, () => {
  activeIndex.value = 0
})

onMounted(() => {
  if (open.value && status.value === 'idle') {
    load()
  }
})

watch(open, async (isOpen) => {
  if (isOpen) {
    if (status.value === 'idle') {
      load()
    }
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
})

function closeDialog() {
  open.value = false
}

function selectResult(result: SearchResult) {
  closeDialog()
  navigateTo(result.entry.path)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (flatResults.value.length > 0) {
      activeIndex.value = (activeIndex.value + 1) % flatResults.value.length
      scrollToActiveOption()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (flatResults.value.length > 0) {
      activeIndex.value =
        (activeIndex.value - 1 + flatResults.value.length) % flatResults.value.length
      scrollToActiveOption()
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const target = flatResults.value[activeIndex.value]
    if (target) {
      selectResult(target)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closeDialog()
  }
}

function scrollToActiveOption() {
  nextTick(() => {
    const el = document.getElementById(`search-option-${activeIndex.value}`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function getContextLabel(result: SearchResult): string {
  const { kind, chapterNumber } = result.entry
  if (kind === 'track') return 'Parcours'
  if (chapterNumber === null) return ''
  if (kind === 'chapter') return `Chapitre ${chapterNumber}`
  if (kind === 'lesson') return `Leçon · Chapitre ${chapterNumber}`
  if (kind === 'heading') return `Section · Chapitre ${chapterNumber}`
  if (kind === 'exercise') return `Exercice · Chapitre ${chapterNumber}`
  return ''
}

function getFlatIndex(result: SearchResult): number {
  return flatResults.value.findIndex((r) => r === result)
}
</script>

<template>
  <UiDialog v-model:open="open" title="Recherche rapide" :fullscreen-on-mobile="true">
    <div class="border-border flex items-center gap-3 border-b px-4 py-3 sm:px-5">
      <Icon name="lucide:search" class="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls="search-results-list"
        :aria-activedescendant="activeOptionId"
        placeholder="Rechercher une notion, un mot-clé…"
        class="placeholder:text-muted-foreground text-foreground flex-1 bg-transparent text-base focus:outline-none"
        @keydown="onKeydown"
      >
      <button
        type="button"
        aria-label="Fermer la recherche"
        class="text-muted-foreground hover:bg-surface-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        @click="closeDialog"
      >
        <kbd class="font-mono text-xs">Échap</kbd>
      </button>
    </div>

    <div
      id="search-results-list"
      role="listbox"
      aria-label="Résultats de recherche"
      class="flex-1 overflow-y-auto p-2 sm:max-h-[60vh] sm:p-3"
    >
      <div v-if="status === 'loading'" class="flex flex-col gap-3 p-4">
        <span class="text-body-sm text-muted-foreground">Chargement…</span>
        <UiSkeleton :lines="3" />
      </div>

      <div v-else-if="status === 'error'" class="flex flex-col items-center gap-3 p-8 text-center">
        <Icon name="lucide:alert-circle" class="text-danger size-8" aria-hidden="true" />
        <p class="text-body-sm text-foreground">
          La recherche est indisponible pour l'instant.
        </p>
        <button
          type="button"
          data-testid="retry-search"
          class="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer"
          @click="load"
        >
          <Icon name="lucide:refresh-cw" class="size-4" aria-hidden="true" />
          Réessayer
        </button>
      </div>

      <div
        v-else-if="query.trim().length < SEARCH_MIN_LENGTH"
        class="text-muted-foreground p-8 text-center text-sm"
      >
        Tapez au moins 2 caractères : une syntaxe, une notion, un mot-clé.
      </div>

      <div
        v-else-if="results.length === 0"
        class="text-muted-foreground p-8 text-center text-sm"
      >
        Aucun résultat pour « {{ query }} ».
      </div>

      <div v-else class="flex flex-col gap-4">
        <div v-for="group in groups" :key="group.trackSlug" class="flex flex-col gap-1">
          <div
            class="text-muted-foreground px-3 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase"
          >
            {{ group.trackName }}
          </div>

          <div
            v-for="res in group.results"
            :id="`search-option-${getFlatIndex(res)}`"
            :key="res.entry.path"
            role="option"
            :aria-selected="getFlatIndex(res) === activeIndex"
            class="hover:bg-surface-muted flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors"
            :class="{
              'bg-surface-muted': getFlatIndex(res) === activeIndex,
            }"
            @click="selectResult(res)"
            @mouseenter="activeIndex = getFlatIndex(res)"
          >
            <div class="flex min-w-0 items-center gap-3">
              <Icon
                :name="SEARCH_KIND_ICONS[res.entry.kind]"
                class="text-muted-foreground size-4 shrink-0"
                aria-hidden="true"
              />
              <div class="flex min-w-0 flex-col">
                <span class="text-foreground truncate text-sm font-semibold">
                  {{ res.entry.title }}
                </span>
              </div>
            </div>

            <span
              v-if="getContextLabel(res)"
              class="border-border text-muted-foreground shrink-0 rounded border px-2 py-0.5 text-[11px]"
            >
              {{ getContextLabel(res) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </UiDialog>
</template>

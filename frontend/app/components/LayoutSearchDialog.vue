<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { SEARCH_KIND_ICONS, SEARCH_MIN_LENGTH } from '~/utils/search'
import type { SearchResult } from '~/types/search'

const search = useSearch()
const { query, results, groups, status, open, load } = search

const inputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(0)

// Liste à plat des résultats visibles pour la navigation au clavier
const flatResults = computed<readonly SearchResult[]>(() =>
  groups.value.flatMap((g) => g.results)
)

const activeOptionId = computed(() =>
  flatResults.value.length > 0 && activeIndex.value >= 0
    ? `search-option-${activeIndex.value}`
    : undefined
)

// Réinitialise la sélection quand les résultats changent
watch(flatResults, () => {
  activeIndex.value = 0
})

onMounted(() => {
  if (open.value && status.value === 'idle') {
    load()
  }
})

// Focus automatique et chargement à l'ouverture
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
  <UiDialog
    v-model:open="open"
    title="Recherche rapide"
    :fullscreen-on-mobile="true"
  >
    <!-- Barre de recherche haute -->
    <div class="border-border relative flex items-center border-b px-4 py-3">
      <Icon
        name="lucide:search"
        class="text-muted-foreground mr-3 size-5 shrink-0"
        aria-hidden="true"
      />
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-controls="search-results-list"
        :aria-activedescendant="activeOptionId"
        aria-autocomplete="list"
        autocomplete="off"
        spellcheck="false"
        placeholder="Rechercher une notion, un mot-clé, un chapitre…"
        class="placeholder:text-muted-foreground text-foreground w-full bg-transparent text-base focus:outline-hidden"
        @keydown="onKeydown"
      >
      <button
        type="button"
        class="hover:bg-surface-muted text-muted-foreground hover:text-foreground ml-2 inline-flex size-8 items-center justify-center rounded-lg transition-colors"
        aria-label="Fermer la recherche"
        @click="closeDialog"
      >
        <Icon name="lucide:x" class="size-5" aria-hidden="true" />
      </button>
    </div>

    <!-- Zone de contenu -->
    <div class="max-h-[60vh] flex-1 overflow-y-auto overscroll-contain p-2">
      <!-- État chargement -->
      <div v-if="status === 'loading'" class="space-y-4 p-4">
        <div class="text-muted-foreground flex items-center gap-2 text-sm">
          <Icon name="lucide:loader-2" class="size-4 animate-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
        <UiSkeleton :lines="3" />
      </div>

      <!-- État erreur -->
      <div v-else-if="status === 'error'" class="p-8 text-center">
        <p class="text-destructive mb-3 text-sm">
          La recherche est indisponible pour l'instant.
        </p>
        <button
          type="button"
          data-testid="retry-search"
          class="border-border bg-surface hover:bg-surface-muted inline-flex min-h-9 items-center justify-center rounded-[10px] border px-4 py-1.5 text-sm font-semibold transition-colors"
          @click="load"
        >
          Réessayer
        </button>
      </div>

      <!-- État vide (moins de 2 caractères) -->
      <div
        v-else-if="query.trim().length < SEARCH_MIN_LENGTH"
        class="text-muted-foreground p-8 text-center text-sm"
      >
        Tapez au moins 2 caractères : une syntaxe, une notion, un mot-clé.
      </div>

      <!-- État sans résultat -->
      <div
        v-else-if="results.length === 0"
        class="text-muted-foreground p-8 text-center text-sm"
      >
        Aucun résultat pour « {{ query }} ».
      </div>

      <!-- Liste des résultats groupés -->
      <div
        v-else
        id="search-results-list"
        role="listbox"
        aria-label="Résultats de recherche"
        class="space-y-4"
      >
        <div
          v-for="group in groups"
          :key="group.trackSlug"
          class="space-y-1"
        >
          <div
            class="text-muted-foreground px-3 py-1 font-mono text-[11px] font-semibold tracking-wider uppercase"
          >
            {{ group.trackName }}
          </div>

          <div
            v-for="result in group.results"
            :id="`search-option-${getFlatIndex(result)}`"
            :key="result.entry.path"
            role="option"
            :aria-selected="getFlatIndex(result) === activeIndex"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
            :class="[
              getFlatIndex(result) === activeIndex
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-surface-muted text-foreground',
            ]"
            @mouseenter="activeIndex = getFlatIndex(result)"
            @click="selectResult(result)"
          >
            <Icon
              :name="SEARCH_KIND_ICONS[result.entry.kind]"
              class="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">
                {{ result.entry.title }}
              </div>
              <div class="text-muted-foreground truncate text-xs">
                {{ getContextLabel(result) }}
              </div>
            </div>
            <Icon
              v-if="getFlatIndex(result) === activeIndex"
              name="lucide:corner-down-left"
              class="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Pied de dialogue avec astuces clavier -->
    <template #actions>
      <div
        class="border-border bg-surface-muted/50 text-muted-foreground hidden items-center justify-between border-t px-4 py-2 text-xs sm:flex"
      >
        <div class="flex items-center gap-4">
          <span class="inline-flex items-center gap-1">
            <kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">↑</kbd>
            <kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">↓</kbd>
            naviguer
          </span>
          <span class="inline-flex items-center gap-1">
            <kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">Entrée</kbd>
            ouvrir
          </span>
          <span class="inline-flex items-center gap-1">
            <kbd class="border-border bg-surface rounded border px-1.5 py-0.5 font-mono">Échap</kbd>
            fermer
          </span>
        </div>
      </div>
    </template>
  </UiDialog>
</template>

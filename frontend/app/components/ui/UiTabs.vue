<script setup lang="ts">
const model = defineModel<string>({ required: true })

interface Props {
  tabs: readonly { id: string; label: string; icon?: string }[]
  idPrefix: string
}

const props = defineProps<Props>()

function selectTab(id: string) {
  model.value = id
}

function onKeydown(e: KeyboardEvent, currentIndex: number) {
  const count = props.tabs.length
  if (count === 0) return

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    const nextIndex = (currentIndex + 1) % count
    const nextTab = props.tabs[nextIndex]
    if (nextTab) model.value = nextTab.id
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const prevIndex = (currentIndex - 1 + count) % count
    const prevTab = props.tabs[prevIndex]
    if (prevTab) model.value = prevTab.id
  }
}
</script>

<template>
  <div class="flex flex-col">
    <div
      role="tablist"
      class="flex border-b border-border bg-surface px-4 gap-4"
    >
      <button
        v-for="(t, idx) in tabs"
        :id="`${idPrefix}-tab-${t.id}`"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="model === t.id"
        :aria-controls="`${idPrefix}-panel-${t.id}`"
        :tabindex="model === t.id ? 0 : -1"
        :class="[
          'relative flex items-center gap-2 py-3 text-sm font-semibold transition-colors duration-150',
          model === t.id
            ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
            : 'text-text-muted hover:text-text',
        ]"
        @click="selectTab(t.id)"
        @keydown="onKeydown($event, idx)"
      >
        <Icon v-if="t.icon" :name="t.icon" class="size-4 shrink-0" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div
      v-for="t in tabs"
      v-show="model === t.id"
      :id="`${idPrefix}-panel-${t.id}`"
      :key="t.id"
      role="tabpanel"
      :aria-labelledby="`${idPrefix}-tab-${t.id}`"
      class="flex-1 overflow-auto focus:outline-none"
      tabindex="0"
    >
      <slot :name="t.id" />
    </div>
  </div>
</template>

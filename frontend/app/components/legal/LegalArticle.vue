<script setup lang="ts">
import { formatLongDate } from '~/utils/formatDate'

interface Props {
  title: string
  updatedAt: string
}

const props = defineProps<Props>()

const formattedDate = computed(() => formatLongDate(props.updatedAt))
</script>

<template>
  <article class="mx-auto w-full max-w-170 py-10 md:py-16">
    <header class="mb-8 border-b border-border pb-6">
      <h1 class="font-display text-3xl md:text-h1 font-bold text-text mb-3">
        {{ title }}
      </h1>
      <p v-if="formattedDate" class="text-xs text-text-muted">
        Dernière mise à jour : {{ formattedDate }}
      </p>
    </header>

    <div class="content-prose text-text leading-relaxed">
      <slot />
    </div>
  </article>
</template>

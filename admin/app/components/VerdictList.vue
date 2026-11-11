<script setup lang="ts">
defineProps<{ checks: readonly Check[] }>()
</script>

<template>
  <ul class="grid gap-2 text-sm">
    <li v-for="(item, i) in checks" :key="i" class="flex items-start gap-2">
      <UIcon
        :name="item.passed ? 'i-lucide-check' : 'i-lucide-x'"
        :class="item.passed ? 'text-success' : 'text-error'"
        class="mt-0.5 shrink-0"
      />
      <div>
        <p>{{ item.label }}</p>
        <p v-if="item.detail" class="text-muted font-mono text-xs">{{ item.detail }}</p>
      </div>
    </li>
  </ul>
</template>

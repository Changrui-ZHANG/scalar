<script setup lang="ts">
const searchOpen = useState<boolean>('search-open', () => false)

function openSearch() {
  searchOpen.value = true
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg text-text">
    <a
      href="#contenu"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold"
    >
      Aller au contenu
    </a>

    <LayoutHeader @open-search="openSearch" />

    <main id="contenu" class="flex-1">
      <slot />
    </main>

    <LayoutFooter />

    <LayoutSearchDialog />
  </div>
</template>

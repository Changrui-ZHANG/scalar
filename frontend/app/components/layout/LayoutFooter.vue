<script setup lang="ts">
/** Pied de page conforme à specs-site.md § 16 */
</script>

<template>
  <footer class="border-t border-border mt-auto bg-surface">
    <div
      class="max-w-280 mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-6 text-[13px] text-text-muted"
    >
      <span>© 2026 Scalar</span>
      <nav aria-label="Liens légaux" class="flex items-center gap-4">
        <NuxtLink
          to="/mentions-legales"
          class="hover:text-text transition-colors"
        >
          Mentions légales
        </NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink
          to="/confidentialite"
          class="hover:text-text transition-colors"
        >
          Confidentialité
        </NuxtLink>
      </nav>
    </div>
  </footer>
</template>

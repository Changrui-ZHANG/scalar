<script setup lang="ts">
/** Liens de navigation principale. */
const LINKS = [
  { to: '/parcours', label: 'Parcours' },
  { to: '/exercices', label: 'Bac à sable' },
  { to: '/demarrer', label: 'Démarrer' },
] as const

const route = useRoute()
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#contenu"
      class="bg-brand text-brand-foreground sr-only z-30 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Aller au contenu
    </a>

    <header class="bg-background/90 sticky top-0 z-20 border-b backdrop-blur">
      <nav
        aria-label="Navigation principale"
        class="max-w-content mx-auto flex min-h-16 items-center justify-between gap-4 px-4"
      >
        <NuxtLink to="/" class="font-display flex min-h-11 items-center gap-2 text-xl font-bold">
          <!-- Decoratif : le nom « Scalar » suit en texte. Meme fichier que le favicon. -->
          <img src="/logo.svg" alt="" width="35" height="35" class="size-[35px]" >
          Scalar
        </NuxtLink>
        <ul class="flex items-center gap-2 sm:gap-6">
          <li v-for="link in LINKS" :key="link.to">
            <NuxtLink
              :to="link.to"
              :aria-current="isActive(link.to) ? 'page' : undefined"
              class="inline-flex min-h-11 items-center px-1 font-semibold"
              :class="
                isActive(link.to)
                  ? 'text-foreground decoration-brand underline decoration-2 underline-offset-8'
                  : 'text-muted-foreground hover:text-foreground'
              "
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </header>

    <main id="contenu" class="max-w-content mx-auto w-full flex-1 px-4 pb-16">
      <slot />
    </main>

    <footer class="border-t">
      <div
        class="max-w-content text-body-sm text-muted-foreground mx-auto flex flex-wrap justify-between gap-2 px-4 py-5"
      >
        <span class="text-foreground font-semibold">Scalar</span>
        <span>Comprendre. Pratiquer. Exécuter.</span>
      </div>
    </footer>
  </div>
</template>

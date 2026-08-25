<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b">
      <nav class="mx-auto flex max-w-6xl items-center justify-between p-4">
        <NuxtLink to="/" class="text-lg font-semibold">Scalar</NuxtLink>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 p-4">
      <slot />
    </main>

    <footer class="border-t">
      <div class="mx-auto max-w-6xl p-4 text-sm">Scalar</div>
    </footer>
  </div>
</template>

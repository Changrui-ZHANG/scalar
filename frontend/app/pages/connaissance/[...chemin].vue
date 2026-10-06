<script setup lang="ts">
/**
 * L'ancienne section Connaissance n'existe plus : ses lecons vivent dans les
 * parcours. Les liens deja partages menent a la meme lecon plutot qu'a un 404.
 *
 * /connaissance                        -> /parcours
 * /connaissance/javascript             -> /parcours/javascript
 * /connaissance/javascript/conditions  -> /parcours/javascript/lecon/conditions
 * /connaissance/conception/…           -> /parcours (categorie commune a tous)
 */
const route = useRoute()
const [section, lesson] = ([] as string[]).concat(route.params.chemin ?? [])

const { find } = await useLanguages()
const language = section ? find(section) : null

const target = !language
  ? '/parcours'
  : lesson
    ? `/parcours/${seg(language.slug)}/lecon/${seg(lesson)}`
    : `/parcours/${seg(language.slug)}`

await navigateTo(target, { redirectCode: 301, replace: true })
</script>

<template>
  <p class="py-10">Redirection vers les parcours…</p>
</template>

/**
 * Le slug suit le titre tant qu'il n'a pas ete modifie a la main.
 * `markEdited` est branche sur la saisie du champ slug. En edition, le slug
 * existant est garde : il figure deja dans des URL.
 */
export function useAutoSlug(
  source: () => string,
  apply: (slug: string) => void,
  alreadySet = false,
) {
  const edited = ref(alreadySet)
  watch(source, (text) => {
    if (!edited.value) {
      apply(slugify(text))
    }
  })
  return {
    markEdited: () => {
      edited.value = true
    },
  }
}

import { A_PROPAGER, entetesAPropager } from '~/utils/entetes-api'

// Service unique d'appel a l'API. Aucun composant ne construit d'URL d'API ni
// ne rappelle ces options.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Cote navigateur, l'API est un chemin de la meme origine : le cookie part
  // seul et il n'y a pas d'hote a nommer. Cote serveur, Nitro ne passe pas par
  // le proxy, donc il lui faut une base absolue et la propagation explicite de
  // ce que le proxy aurait porte.
  const api = $fetch.create({
    baseURL: import.meta.server ? config.apiInterne : config.public.apiBase,
    credentials: 'include',
    headers: entetesAPropager(useRequestHeaders([...A_PROPAGER])),
  })

  return { provide: { api } }
})

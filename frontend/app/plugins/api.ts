import type { ChargeUtileSession } from '@scalar/shared/session.ts'
import { useSessionStore } from '~/stores/session'
import { A_PROPAGER, entetesAPropager } from '~/utils/entetes-api'

// Service unique d'appel a l'API. Aucun composant ne construit d'URL d'API ni
// ne rappelle ces options.
export default defineNuxtPlugin(async (nuxtApp) => {
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

  // Rehydratation de la session au demarrage si le magasin Pinia est disponible
  if (nuxtApp?.$pinia && (import.meta.server || !useSessionStore(nuxtApp.$pinia).compte)) {
    const sessionStore = useSessionStore(nuxtApp.$pinia)
    try {
      const compte = await api<ChargeUtileSession>('/sessions/current')
      sessionStore.ouvrir(compte)
    } catch {
      sessionStore.fermer()
    }
  }

  return {
    provide: {
      api: ((...args: Parameters<typeof api>) => {
        const customApi = (nuxtApp as unknown as { _customApi?: typeof api })?._customApi
        if (customApi) {
          return customApi(...args)
        }
        return api(...args)
      }) as typeof api,
    },
  }
})

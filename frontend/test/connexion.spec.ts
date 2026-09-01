import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { MESSAGES_VIOLATION } from '@scalar/shared/erreurs.ts'
import Connexion from '../app/pages/connexion.vue'
import LayoutDefault from '../app/layouts/default.vue'
import { useSessionStore } from '../app/stores/session.ts'

const { appelApi, naviguer } = vi.hoisted(() => ({
  appelApi: vi.fn(),
  naviguer: vi.fn(),
}))

mockNuxtImport('navigateTo', () => naviguer)

const SAISIE_VALIDE = {
  '#email': 'alice@exemple.test',
  '#mot-de-passe': 'un mot de passe quelconque',
}

async function remplir(
  page: Awaited<ReturnType<typeof mountSuspended>>,
  saisie: Record<string, string>,
) {
  for (const [selecteur, valeur] of Object.entries(saisie)) {
    await page.find(selecteur).setValue(valeur)
  }
}

describe("ecran de connexion", () => {
  beforeEach(() => {
    appelApi.mockReset()
    naviguer.mockReset()
    ;(useNuxtApp() as unknown as { _customApi?: unknown })._customApi = appelApi
    const store = useSessionStore()
    store.fermer()
  })

  it('demande les deux champs, chacun avec un libelle visible', async () => {
    const page = await mountSuspended(Connexion)
    const libelles = page.findAll('label').map((noeud) => noeud.text())

    expect(libelles).toEqual(['Adresse email', 'Mot de passe'])
  })

  it('refuse une saisie invalide sans appeler l API, en nommant chaque champ', async () => {
    const page = await mountSuspended(Connexion)

    await remplir(page, {
      '#email': 'pas-une-adresse',
      '#mot-de-passe': '',
    })
    await page.find('form').trigger('submit')

    expect(appelApi).not.toHaveBeenCalled()
    expect(page.find('#erreur-email').text()).toBe(MESSAGES_VIOLATION.forme)
    expect(page.find('#erreur-mot-de-passe').text()).toBe(MESSAGES_VIOLATION.longueur)
  })

  it('envoie la saisie validee et emmene vers le tableau de bord', async () => {
    appelApi.mockResolvedValue({
      id: 'a',
      displayName: 'Alice Martin',
      accountState: 'active',
      situations: [],
    })

    const page = await mountSuspended(Connexion)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    expect(appelApi).toHaveBeenCalledWith('/sessions', {
      method: 'POST',
      body: {
        email: 'alice@exemple.test',
        motDePasse: 'un mot de passe quelconque',
      },
    })
    expect(naviguer).toHaveBeenCalledWith('/tableau-de-bord')
    const store = useSessionStore()
    expect(store.compte?.displayName).toBe('Alice Martin')
  })

  it('affiche le message du serveur quand les identifiants sont invalides', async () => {
    appelApi.mockRejectedValue({
      data: {
        code: 'IDENTIFIANTS_INVALIDES',
        message: 'Adresse email ou mot de passe incorrect.',
      },
    })

    const page = await mountSuspended(Connexion)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    expect(page.find('[role="alert"]').text()).toBe('Adresse email ou mot de passe incorrect.')
    expect(naviguer).not.toHaveBeenCalled()
  })

  it('replace les violations du serveur sur leurs champs', async () => {
    appelApi.mockRejectedValue({
      data: {
        code: 'REQUETE_INVALIDE',
        message: 'Votre demande n’a pas la forme attendue.',
        violations: [{ chemin: 'email', message: MESSAGES_VIOLATION.forme }],
      },
    })

    const page = await mountSuspended(Connexion)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    expect(page.find('#erreur-email').text()).toBe(MESSAGES_VIOLATION.forme)
  })

  it('dit quoi faire quand la demande n a meme pas abouti', async () => {
    appelApi.mockRejectedValue(new Error('reseau coupe'))

    const page = await mountSuspended(Connexion)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    const alerte = page.find('[role="alert"]').text()

    expect(alerte).not.toBe('')
    expect(alerte).not.toContain('reseau coupe')
  })
})

describe("deconnexion depuis le layout", () => {
  beforeEach(() => {
    appelApi.mockReset()
    naviguer.mockReset()
    ;(useNuxtApp() as unknown as { _customApi?: unknown })._customApi = appelApi
  })

  it('affiche les liens visiteur quand aucun compte n est connecte', async () => {
    const store = useSessionStore()
    store.fermer()

    const layout = await mountSuspended(LayoutDefault)

    expect(layout.text()).toContain('Se connecter')
    expect(layout.text()).toContain('Créer un compte')
    expect(layout.text()).not.toContain('Se déconnecter')
  })

  it('affiche le tableau de bord et le bouton de deconnexion quand connecte', async () => {
    const store = useSessionStore()
    store.ouvrir({
      id: 'a',
      displayName: 'Alice Martin',
      accountState: 'active',
      situations: [],
    })

    const layout = await mountSuspended(LayoutDefault)

    expect(layout.text()).toContain('Tableau de bord')
    expect(layout.text()).toContain('Se déconnecter')
    expect(layout.text()).not.toContain('Se connecter')
  })

  it('appelle DELETE /sessions, vide la session et redirige vers / lors du clic sur deconnexion', async () => {
    const store = useSessionStore()
    store.ouvrir({
      id: 'a',
      displayName: 'Alice Martin',
      accountState: 'active',
      situations: [],
    })

    appelApi.mockResolvedValue(undefined)

    const layout = await mountSuspended(LayoutDefault)
    const bouton = layout.find('button')
    expect(bouton.text()).toBe('Se déconnecter')

    await bouton.trigger('click')

    expect(appelApi).toHaveBeenCalledWith('/sessions', { method: 'DELETE' })
    expect(store.compte).toBeNull()
    expect(naviguer).toHaveBeenCalledWith('/')
  })
})

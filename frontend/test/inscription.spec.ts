import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { LONGUEUR_MIN_MOT_DE_PASSE } from '@scalar/shared/inscription.ts'
import { MESSAGES_VIOLATION } from '@scalar/shared/erreurs.ts'
import Inscription from '../app/pages/inscription.vue'

const { appelApi, naviguer } = vi.hoisted(() => ({
  appelApi: vi.fn(),
  naviguer: vi.fn(),
}))

// La navigation est remplacee par son import auto, ce qui laisse le reste de
// l'application Nuxt intact — remplacer `useNuxtApp` entier casserait tout ce
// qui s'en sert, a commencer par le routeur.
mockNuxtImport('navigateTo', () => naviguer)

const SAISIE_VALIDE = {
  '#nom-affiche': 'Alice Martin',
  '#email': 'alice@exemple.test',
  '#mot-de-passe': 'un mot de passe assez long',
}

async function remplir(
  page: Awaited<ReturnType<typeof mountSuspended>>,
  saisie: Record<string, string>,
) {
  for (const [selecteur, valeur] of Object.entries(saisie)) {
    await page.find(selecteur).setValue(valeur)
  }
}

describe("ecran d'inscription", () => {
  beforeEach(() => {
    appelApi.mockReset()
    naviguer.mockReset()
    ;(useNuxtApp() as unknown as { _customApi?: unknown })._customApi = appelApi
  })

  // La politique doit etre lisible sans avoir rien saisi : en reaction a un
  // echec, elle arrive toujours trop tard.
  it('enonce la politique de mot de passe avant toute saisie', async () => {
    const page = await mountSuspended(Inscription)

    expect(page.find('#politique-mot-de-passe').exists()).toBe(true)
    expect(page.text()).toContain(String(LONGUEUR_MIN_MOT_DE_PASSE))
  })

  // Le nombre vient du contrat, pas d'une phrase ecrite a la main : ce cas
  // echoue si quelqu'un recopie la valeur dans le gabarit.
  it('compose la politique depuis le plancher declare', async () => {
    const page = await mountSuspended(Inscription)
    const politique = page.find('#politique-mot-de-passe').text()

    expect(politique).toContain(`${LONGUEUR_MIN_MOT_DE_PASSE} caractères`)
  })

  it('lie le champ de mot de passe a la politique pour un lecteur d ecran', async () => {
    const page = await mountSuspended(Inscription)

    expect(page.find('#mot-de-passe').attributes('aria-describedby')).toContain(
      'politique-mot-de-passe',
    )
  })

  it('demande les trois champs, chacun avec un libelle visible', async () => {
    const page = await mountSuspended(Inscription)
    const libelles = page.findAll('label').map((noeud) => noeud.text())

    expect(libelles).toEqual(['Nom affiché', 'Adresse email', 'Mot de passe'])
  })

  // Le plafond d'inscription est serre : une faute de frappe envoyee au serveur
  // consommerait une des tentatives autorisees.
  it('refuse une saisie invalide sans appeler l API, en nommant chaque champ', async () => {
    const page = await mountSuspended(Inscription)

    await remplir(page, {
      '#nom-affiche': '',
      '#email': 'pas-une-adresse',
      '#mot-de-passe': 'court',
    })
    await page.find('form').trigger('submit')

    expect(appelApi).not.toHaveBeenCalled()
    expect(page.find('#erreur-nom-affiche').text()).toBe(MESSAGES_VIOLATION.longueur)
    expect(page.find('#erreur-email').text()).toBe(MESSAGES_VIOLATION.forme)
    expect(page.find('#erreur-mot-de-passe').text()).toBe(MESSAGES_VIOLATION.longueur)
  })

  it('refuse un mot de passe d un caractere sous le plancher declare', async () => {
    const page = await mountSuspended(Inscription)

    await remplir(page, {
      ...SAISIE_VALIDE,
      '#mot-de-passe': 'a'.repeat(LONGUEUR_MIN_MOT_DE_PASSE - 1),
    })
    await page.find('form').trigger('submit')

    expect(appelApi).not.toHaveBeenCalled()
    expect(page.find('#erreur-mot-de-passe').exists()).toBe(true)
  })

  it('accepte un mot de passe exactement au plancher', async () => {
    appelApi.mockResolvedValue({
      id: 'a',
      displayName: 'Alice Martin',
      accountState: 'unverified',
      situations: [],
    })

    const page = await mountSuspended(Inscription)

    await remplir(page, {
      ...SAISIE_VALIDE,
      '#mot-de-passe': 'a'.repeat(LONGUEUR_MIN_MOT_DE_PASSE),
    })
    await page.find('form').trigger('submit')

    expect(appelApi).toHaveBeenCalledTimes(1)
  })

  it('envoie la saisie validee et emmene vers le tableau de bord', async () => {
    appelApi.mockResolvedValue({
      id: 'a',
      displayName: 'Alice Martin',
      accountState: 'unverified',
      situations: ['compteNonVerifie'],
      adresseAVerifier: 'alice@exemple.test',
    })

    const page = await mountSuspended(Inscription)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    expect(appelApi).toHaveBeenCalledWith('/accounts', {
      method: 'POST',
      body: {
        displayName: 'Alice Martin',
        email: 'alice@exemple.test',
        motDePasse: 'un mot de passe assez long',
      },
    })
    expect(naviguer).toHaveBeenCalledWith('/tableau-de-bord')
  })

  // Le message servi vient du catalogue d'erreurs : l'ecran l'affiche tel quel
  // plutot que d'en reecrire un de son cru.
  it('affiche le message du serveur quand l adresse est deja prise', async () => {
    appelApi.mockRejectedValue({
      data: {
        code: 'ADRESSE_DEJA_UTILISEE',
        message: 'Cette adresse est déjà associée à un compte.',
      },
    })

    const page = await mountSuspended(Inscription)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    expect(page.find('[role="alert"]').text()).toBe('Cette adresse est déjà associée à un compte.')
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

    const page = await mountSuspended(Inscription)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    expect(page.find('#erreur-email').text()).toBe(MESSAGES_VIOLATION.forme)
  })

  // Un echec reseau n'a pas de corps : sans repli, l'ecran resterait muet apres
  // un envoi qui a visiblement echoue.
  it('dit quoi faire quand la demande n a meme pas abouti', async () => {
    appelApi.mockRejectedValue(new Error('reseau coupe'))

    const page = await mountSuspended(Inscription)

    await remplir(page, SAISIE_VALIDE)
    await page.find('form').trigger('submit')

    const alerte = page.find('[role="alert"]').text()

    expect(alerte).not.toBe('')
    expect(alerte).not.toContain('reseau coupe')
  })
})

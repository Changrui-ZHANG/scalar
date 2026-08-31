import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { SITUATIONS_COMPTE } from '@scalar/shared/session.ts'
import type { ChargeUtileSession } from '@scalar/shared/session.ts'
import BandeauCompte from '../app/components/BandeauCompte.vue'
import { useSessionStore } from '../app/stores/session'

const COMPTE_NON_VERIFIE: ChargeUtileSession = {
  id: 'a',
  displayName: 'Alice Martin',
  accountState: 'unverified',
  situations: ['compteNonVerifie'],
  adresseAVerifier: 'alice@exemple.test',
}

// Le magasin est celui de l'application Nuxt montee par le test, jamais une
// instance creee a cote : le composant lit celle qui lui est injectee, et deux
// instances feraient dependre le resultat de l'ordre d'execution.
function magasin() {
  return useSessionStore(useNuxtApp().$pinia)
}

describe('bandeau d etat de compte', () => {
  beforeEach(() => {
    magasin().compte = null
  })

  it('ne rend rien tant qu aucune session n est ouverte', async () => {
    const bandeau = await mountSuspended(BandeauCompte)

    expect(bandeau.text()).toBe('')
  })

  it('ne rend rien pour un compte sans situation', async () => {
    magasin().ouvrir({
      id: 'a',
      displayName: 'Alice Martin',
      accountState: 'active',
      situations: [],
    })

    const bandeau = await mountSuspended(BandeauCompte)

    expect(bandeau.text()).toBe('')
  })

  it('nomme l adresse ciblee quand le compte n est pas verifie', async () => {
    magasin().ouvrir(COMPTE_NON_VERIFIE)

    const bandeau = await mountSuspended(BandeauCompte)

    expect(bandeau.text()).toContain('alice@exemple.test')
    expect(bandeau.text()).toContain('vérifiée')
  })

  // La formulation d'origine annonçait qu'un lien de verification avait ete
  // envoye. Rien ne l'envoie encore : l'annoncer promettrait ce que le systeme
  // ne fait pas. La phrase complete revient avec le module qui la rend vraie.
  it('n annonce pas un envoi que rien ne fait', async () => {
    magasin().ouvrir(COMPTE_NON_VERIFIE)

    const bandeau = await mountSuspended(BandeauCompte)
    const texte = bandeau.text().toLowerCase()

    expect(texte).not.toContain('envoyé')
    expect(texte).not.toContain('envoye')
    expect(texte).not.toContain('boîte de réception')
    expect(texte).not.toContain('lien de vérification')
  })

  // Persistant et non refermable tant que la condition tient : le refermer
  // donnerait l'illusion que l'etat a disparu.
  it('n offre aucune fermeture', async () => {
    magasin().ouvrir(COMPTE_NON_VERIFIE)

    const bandeau = await mountSuspended(BandeauCompte)

    expect(bandeau.findAll('button')).toHaveLength(0)
    expect(bandeau.html()).not.toContain('aria-label="Fermer"')
  })

  // Un seul bandeau a la fois, priorite au plus restrictif. L'ordre n'est pas
  // decide par le composant : il est declare dans le contrat, et ce cas verifie
  // que le composant lit bien le premier candidat qu'il designe.
  it('n affiche qu une situation, la plus restrictive', async () => {
    magasin().ouvrir({
      ...COMPTE_NON_VERIFIE,
      situations: [...SITUATIONS_COMPTE],
    })

    const bandeau = await mountSuspended(BandeauCompte)

    expect(bandeau.findAll('[role="status"]')).toHaveLength(1)
    expect(bandeau.text()).toContain('alice@exemple.test')
  })

  it('reste dans le flux plutot que superpose au contenu', async () => {
    magasin().ouvrir(COMPTE_NON_VERIFIE)

    const bandeau = await mountSuspended(BandeauCompte)
    const classes = bandeau.find('[role="status"]').classes().join(' ')

    // Ni `fixed` ni `absolute` : un bandeau superpose peut occulter un element
    // qui vient de recevoir le focus.
    expect(classes).not.toContain('fixed')
    expect(classes).not.toContain('absolute')
  })
})

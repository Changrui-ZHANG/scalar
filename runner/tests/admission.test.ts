import { describe, expect, it } from 'vitest'
import { Admission } from '../src/execution/admission.ts'

// Aucune dependance Docker ici : l'admission est un compteur en memoire
// (AD-26), testable seule.
describe('Admission', () => {
  it('admet immediatement tant que le plafond n est pas atteint', () => {
    const admission = new Admission(2)

    const premiere = admission.essayer()
    const seconde = admission.essayer()

    expect(premiere.admis).toBe(true)
    expect(seconde.admis).toBe(true)
  })

  it('met en file au-dela du plafond, avec une position observable, sans jamais refuser', () => {
    const admission = new Admission(1)

    const premiere = admission.essayer()
    const seconde = admission.essayer()

    expect(premiere.admis).toBe(true)
    expect(seconde.admis).toBe(false)
    if (!seconde.admis) {
      expect(seconde.position).toBe(1)
    }
  })

  it('transmet le jeton libere directement au premier en attente, dans l ordre (FIFO)', async () => {
    const admission = new Admission(1)
    const ordreResolu: string[] = []

    const a = admission.essayer()
    expect(a.admis).toBe(true)

    const b = admission.essayer()
    const c = admission.essayer()
    expect(b.admis).toBe(false)
    expect(c.admis).toBe(false)

    void b.attendreTour.then(() => ordreResolu.push('b'))
    void c.attendreTour.then(() => ordreResolu.push('c'))

    expect(admission.nombreEnAttente).toBe(2)

    // Libere le jeton de `a` : c'est `b`, arrive en premier, qui doit
    // reprendre la main, pas `c`.
    admission.liberer()
    await b.attendreTour

    expect(ordreResolu).toEqual(['b'])
    expect(admission.nombreEnAttente).toBe(1)

    admission.liberer()
    await c.attendreTour

    expect(ordreResolu).toEqual(['b', 'c'])
    expect(admission.nombreEnAttente).toBe(0)
  })

  it('rend un jeton au pool commun quand personne n attend', () => {
    const admission = new Admission(1)

    const a = admission.essayer()
    expect(a.admis).toBe(true)

    admission.liberer()

    const b = admission.essayer()
    expect(b.admis).toBe(true)
  })

  it('refuse un plafond de concurrence inferieur a 1', () => {
    expect(() => new Admission(0)).toThrow()
  })
})

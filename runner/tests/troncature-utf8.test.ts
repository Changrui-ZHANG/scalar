import { describe, expect, it } from 'vitest'
import { limiteUtf8Valide } from '../src/execution/invoquerConteneur.ts'

// Pure, sans Docker : verifie que la troncature de sortie (AD-24) ne coupe
// jamais une sequence UTF-8 multi-octets en son milieu, ce qui produirait
// sinon un caractere de remplacement (U+FFFD) illisible a la frontiere.
describe('limiteUtf8Valide', () => {
  it('rend la longueur du tampon quand la limite la depasse deja', () => {
    const tampon = Buffer.from('bonjour', 'utf8')

    expect(limiteUtf8Valide(tampon, 1000)).toBe(tampon.length)
  })

  it('coupe net sur un caractere ASCII', () => {
    const tampon = Buffer.from('abcdef', 'utf8')

    expect(limiteUtf8Valide(tampon, 3)).toBe(3)
  })

  it('recule avant une sequence de 2 octets coupee en son milieu (e accentue)', () => {
    // 'a' (1 octet) + 'é' (2 octets : 0xC3 0xA9) + 'b' (1 octet)
    const tampon = Buffer.from('aéb', 'utf8')
    expect(tampon.length).toBe(4)

    // Limite au milieu de 'é' (apres son octet de tete, avant sa
    // continuation) : la sequence entiere doit disparaitre.
    const limite = limiteUtf8Valide(tampon, 2)

    expect(limite).toBe(1)
    expect(tampon.subarray(0, limite).toString('utf8')).toBe('a')
    expect(tampon.subarray(0, limite).toString('utf8')).not.toContain('�')
  })

  it('recule avant une sequence de 3 octets coupee en son milieu (symbole euro)', () => {
    // '€' = 0xE2 0x82 0xAC (3 octets)
    const tampon = Buffer.from('x€y', 'utf8')
    expect(tampon.length).toBe(5)

    for (const limite of [2, 3]) {
      const bornee = limiteUtf8Valide(tampon, limite)
      const texte = tampon.subarray(0, bornee).toString('utf8')

      expect(texte).not.toContain('�')
      expect(texte).toBe('x')
    }
  })

  it('recule avant une sequence de 4 octets coupee en son milieu (emoji)', () => {
    // '😀' = 0xF0 0x9F 0x98 0x80 (4 octets)
    const tampon = Buffer.from('x😀y', 'utf8')
    expect(tampon.length).toBe(6)

    for (const limite of [1, 2, 3, 4]) {
      const bornee = limiteUtf8Valide(tampon, limite)
      const texte = tampon.subarray(0, bornee).toString('utf8')

      expect(texte).not.toContain('�')
      expect(texte).toBe('x')
    }
  })

  it('ne recule pas quand la limite tombe exactement apres une sequence complete', () => {
    // 'é' tient dans les deux premiers octets : couper a 3 laisse 'é' entier
    // plus le debut de 'b', qui est ASCII — rien a reculer.
    const tampon = Buffer.from('éb', 'utf8')
    expect(tampon.length).toBe(3)

    expect(limiteUtf8Valide(tampon, 2)).toBe(2)
    expect(tampon.subarray(0, 2).toString('utf8')).toBe('é')
  })
})

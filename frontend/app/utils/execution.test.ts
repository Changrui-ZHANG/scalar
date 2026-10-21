import { describe, expect, it } from 'vitest'
import {
  CODE_MAX_BYTES,
  CODE_TOO_LARGE_MESSAGE,
  getCodeByteLength,
  isCodeTooLarge,
  runErrorMessage,
} from './execution'

describe('utils/execution', () => {
  it('calcule la taille en octets UTF-8 et détecte les dépassements', () => {
    expect(getCodeByteLength('hello')).toBe(5)
    expect(getCodeByteLength('é')).toBe(2)
    expect(isCodeTooLarge('a'.repeat(CODE_MAX_BYTES))).toBe(false)
    expect(isCodeTooLarge('a'.repeat(CODE_MAX_BYTES + 1))).toBe(true)
    expect(CODE_TOO_LARGE_MESSAGE).toBe('Votre code dépasse 64 Kio.')
  })

  it('formate les messages d’erreur conformément aux spécifications', () => {
    expect(runErrorMessage(503)).toBe("Le moteur d'exécution est momentanément indisponible.")
    expect(runErrorMessage(429)).toBe("Trop d'exécutions en peu de temps. Réessayez dans une minute.")
    expect(runErrorMessage(404, 'verify')).toBe("Cet exercice n'est plus en ligne. Votre code reste enregistré ici.")
    expect(runErrorMessage(500)).toBe('Une erreur est survenue. Réessayez dans un instant.')
    expect(runErrorMessage('network error')).toBe(
      "Le service d'exécution n'a pas répondu. Vérifiez votre connexion puis réessayez.",
    )
    expect(runErrorMessage({ statusCode: 400, message: 'Syntaxe invalide' })).toBe('Syntaxe invalide')
  })
})

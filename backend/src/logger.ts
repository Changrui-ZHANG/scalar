import pino from 'pino'

/**
 * Journal applicatif unique du backend.
 *
 * Tout ce qui concerne une defaillance -- URL appelee, statut recu, corps de la
 * reponse -- s'ecrit ici et nulle part ailleurs : le client ne recoit jamais
 * qu'un message generique.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
})

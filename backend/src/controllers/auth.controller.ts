import type { CookieOptions, NextFunction, Request, Response } from 'express'
import { DUREE_SESSION_MS } from '@scalar/shared/limites.ts'
import { NOM_COOKIE_PREFERENCES, NOM_COOKIE_SESSION } from '@scalar/shared/session.ts'
import { ErreurApi } from '@scalar/shared/erreurs.ts'
import type { AuthService } from '../services/auth.service.ts'
import type { Valide } from '../middlewares/validation.middleware.ts'
import type { EntreeInscription } from '@scalar/shared/inscription.ts'
import type { EntreeConnexion } from '@scalar/shared/connexion.ts'
import { lireCookie, lirePrincipal } from '../middlewares/session.middleware.ts'

// Le transport, et rien d'autre : aucune regle d'inscription ou de session, aucun acces base,
// aucune decision d'acces. Ce fichier sait poser un cookie et choisir un statut.
export class AuthController {
  private readonly service: AuthService
  private readonly valideInscription: Valide<EntreeInscription>
  private readonly valideConnexion: Valide<EntreeConnexion>
  private readonly cookieSecurise: boolean

  // Affectations explicites : une propriete de parametre genererait du code a
  // l'execution, que Node rejette apres retrait des types.
  constructor(
    service: AuthService,
    valideInscription: Valide<EntreeInscription>,
    valideConnexion: Valide<EntreeConnexion>,
    cookieSecurise: boolean,
  ) {
    this.service = service
    this.valideInscription = valideInscription
    this.valideConnexion = valideConnexion
    this.cookieSecurise = cookieSecurise
  }

  private optionsCookie(expireA: Date): CookieOptions {
    return {
      // Le jeton reste hors de portee de tout script : c'est la seule chose qui
      // rende une faille XSS non equivalente a un vol de session.
      httpOnly: true,
      // Retire en developpement seulement, ou le produit est servi en clair sur
      // localhost et ou un cookie `Secure` ne reviendrait jamais.
      secure: this.cookieSecurise,
      // `Lax` et non `Strict` : la verification d'adresse, le retour du tunnel
      // de paiement et la reinitialisation sont des navigations de premier
      // niveau depuis un tiers, ou `Strict` perdrait la session.
      sameSite: 'lax',
      path: '/',
      expires: expireA,
      // Meme duree que `expiresAt`, mais elle ne fait pas autorite : un cookie
      // est une valeur que le client peut garder, et c'est la lecture serveur
      // qui decide de l'expiration.
      maxAge: DUREE_SESSION_MS,
    }
  }

  private optionsSuppressionCookie(httpOnly: boolean): CookieOptions {
    return {
      httpOnly,
      secure: this.cookieSecurise,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    }
  }

  creerCompte = async (
    requete: Request,
    reponse: Response,
    suivant: NextFunction,
  ): Promise<void> => {
    try {
      const { chargeUtile, session } = await this.service.creerCompte(
        this.valideInscription.lire(requete),
      )

      if (session !== undefined) {
        reponse.cookie(NOM_COOKIE_SESSION, session.jeton, this.optionsCookie(session.expireA))
      }

      // Le corps porte la charge utile de session declaree dans `shared`, et
      // elle seule : ni le jeton, ni un hachage, ni un document de base.
      reponse.status(201).json(chargeUtile)
    } catch (erreur) {
      suivant(erreur)
    }
  }

  connecter = async (
    requete: Request,
    reponse: Response,
    suivant: NextFunction,
  ): Promise<void> => {
    try {
      const { chargeUtile, session } = await this.service.connecter(
        this.valideConnexion.lire(requete),
      )

      reponse.cookie(NOM_COOKIE_SESSION, session.jeton, this.optionsCookie(session.expireA))
      reponse.status(200).json(chargeUtile)
    } catch (erreur) {
      suivant(erreur)
    }
  }

  deconnecter = async (
    requete: Request,
    reponse: Response,
    suivant: NextFunction,
  ): Promise<void> => {
    try {
      const jeton = lireCookie(requete.headers.cookie, NOM_COOKIE_SESSION)

      if (jeton !== undefined && jeton !== '') {
        await this.service.deconnecter(jeton)
      }

      // Expire les deux cookies declares
      reponse.cookie(NOM_COOKIE_SESSION, '', this.optionsSuppressionCookie(true))
      reponse.cookie(NOM_COOKIE_PREFERENCES, '', this.optionsSuppressionCookie(false))

      reponse.status(204).end()
    } catch (erreur) {
      suivant(erreur)
    }
  }

  obtenirSessionCourante = async (
    requete: Request,
    reponse: Response,
    suivant: NextFunction,
  ): Promise<void> => {
    try {
      const principal = lirePrincipal(requete)

      if (principal === undefined) {
        throw new ErreurApi('NON_AUTHENTIFIE')
      }

      const chargeUtile = await this.service.obtenirChargeUtile(principal)

      reponse.status(200).json(chargeUtile)
    } catch (erreur) {
      suivant(erreur)
    }
  }
}

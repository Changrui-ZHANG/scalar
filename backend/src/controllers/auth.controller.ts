import type { CookieOptions, NextFunction, Request, Response } from 'express'
import { DUREE_SESSION_MS } from '@scalar/shared/limites.ts'
import { NOM_COOKIE_SESSION } from '@scalar/shared/session.ts'
import type { AuthService } from '../services/auth.service.ts'
import type { Valide } from '../middlewares/validation.middleware.ts'
import type { EntreeInscription } from '@scalar/shared/inscription.ts'

// Le transport, et rien d'autre : aucune regle d'inscription, aucun acces base,
// aucune decision d'acces. Ce fichier sait poser un cookie et choisir un statut.
export class AuthController {
  private readonly service: AuthService
  private readonly valide: Valide<EntreeInscription>
  private readonly cookieSecurise: boolean

  // Affectations explicites : une propriete de parametre genererait du code a
  // l'execution, que Node rejette apres retrait des types.
  constructor(
    service: AuthService,
    valide: Valide<EntreeInscription>,
    cookieSecurise: boolean,
  ) {
    this.service = service
    this.valide = valide
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

  creerCompte = async (
    requete: Request,
    reponse: Response,
    suivant: NextFunction,
  ): Promise<void> => {
    try {
      const { chargeUtile, session } = await this.service.creerCompte(this.valide.lire(requete))

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
}

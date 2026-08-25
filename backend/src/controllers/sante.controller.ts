import type { Request, Response } from 'express'
import { SanteService } from '../services/sante.service.ts'

export class SanteController {
  private readonly service: SanteService

  // Node retire les types sans les compiler : une propriete de parametre
  // (`constructor(private x)`) genererait du code a l'execution et serait
  // rejetee au demarrage. L'affectation est donc explicite.
  constructor(service: SanteService = new SanteService()) {
    this.service = service
  }

  lire = (_requete: Request, reponse: Response): void => {
    reponse.json(this.service.lireEtat())
  }
}

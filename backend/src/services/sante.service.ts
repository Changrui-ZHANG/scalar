export interface EtatSante {
  statut: 'ok'
  horodatage: string
}

export class SanteService {
  lireEtat(): EtatSante {
    return { statut: 'ok', horodatage: new Date().toISOString() }
  }
}

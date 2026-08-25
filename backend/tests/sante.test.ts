import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { construireApp } from '../src/app.ts'

describe('GET /api/v1/health', () => {
  it('repond ok', async () => {
    const reponse = await request(construireApp()).get('/api/v1/health')

    expect(reponse.status).toBe(200)
    expect(reponse.body.statut).toBe('ok')
  })
})

describe('route inconnue', () => {
  it('repond avec un code d erreur structure', async () => {
    const reponse = await request(construireApp()).get('/api/v1/inconnu')

    expect(reponse.status).toBe(404)
    expect(reponse.body.code).toBe('ROUTE_INTROUVABLE')
  })
})

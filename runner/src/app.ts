// Meme scission que le backend (`backend/src/app.ts` / `index.ts`) : construit
// l'application sans l'ecouter, pour qu'un test puisse l'exercer sans ouvrir
// de port.
export { construireApp } from './http/serveur.ts'

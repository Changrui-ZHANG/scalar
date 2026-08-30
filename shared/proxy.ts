// Depositaire unique de ce que le backend sait de ce qui se tient devant lui.
// La valeur ci-dessous n'est pas une preference : sans borne declaree, soit le
// proxy n'est pas de confiance et tout le trafic rendu cote serveur partage une
// seule identite, soit il l'est sans limite et l'identite devient fournie par le
// client. Les deux echouent, et seulement en production.

// Un seul saut : Traefik, en terminaison TLS et origine unique. Le jour ou un
// CDN se place devant, cette valeur passe a 2 — et c'est le seul endroit a
// changer.
//
// Deux chemins atteignent le backend, et la valeur vaut pour les deux :
//   navigateur -> Traefik -> backend      — Traefik ajoute l'entree, un saut ;
//   navigateur -> Traefik -> Nitro -> backend — Nitro ne traverse pas Traefik
//     et n'ajoute rien : il **recopie** la chaine recue, qui porte donc
//     toujours exactement un saut. Le plugin `frontend/app/plugins/api.ts`
//     propage cet en-tete tel quel ; le jour ou il en ajouterait un, cette
//     valeur cesserait de decrire le second chemin.
//
// Un appel qui n'a traverse aucun proxy — un service du reseau interne — ne
// porte pas la chaine et retombe donc en `interne`, hors des plafonds anonymes.
export const SAUTS_PROXY_DE_CONFIANCE = 1

export const EN_TETE_TRANSFERT = 'x-forwarded-for'

// 128 bits d'un HMAC : irreversible sans le secret, et sans collision a
// l'echelle d'un compteur de debit. Tronquer plus court echangerait de la
// place de journal contre des seaux de limitation fusionnes.
export const LONGUEUR_PSEUDONYME = 32

// Longueur minimale du secret de pseudonymisation. En dessous, le HMAC se
// force par recherche exhaustive et le pseudonyme redevient une adresse.
export const LONGUEUR_MINIMALE_SECRET = 32

// La longueur seule ne dit rien de l'entropie : la valeur de remplissage du
// modele d'environnement la depasse largement et passerait la validation
// telle quelle. Un secret n'est pas un secret parce qu'il est long.
const VALEURS_DE_REMPLISSAGE = ['remplacez-moi', 'changez-moi', 'a-remplacer']

export function estSecretDeRemplissage(valeur: string): boolean {
  const normalisee = valeur.toLowerCase()

  return VALEURS_DE_REMPLISSAGE.some((motif) => normalisee.includes(motif))
}

// `interne` ne porte pas de pseudonyme : un appel qui n'a traverse aucun proxy
// de confiance n'a pas d'identite de client a nommer, et lui en fabriquer une
// ferait partager un seau de limitation a tout le rendu serveur.
export type IdentiteClient =
  | { readonly nature: 'publique'; readonly pseudonyme: string }
  | { readonly nature: 'interne' }

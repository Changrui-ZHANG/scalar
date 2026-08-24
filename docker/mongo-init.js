// Initialisation du replica set. Idempotent : rejouer ce script ne fait rien.
// L'hote annonce doit etre le nom de service du compose — le pilote se
// reconnecte au nom annonce, pas a celui de la chaine de connexion.
try {
  rs.status()
  print('replica set deja initialise')
} catch (erreur) {
  rs.initiate({
    _id: 'rs0',
    members: [{ _id: 0, host: 'mongo:27017' }],
  })
  print('replica set initialise')
}

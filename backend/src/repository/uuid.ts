const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Prisma lève sur un id mal formé pour une colonne UUID, là où le dépôt en mémoire répond null.
export const isUuid = (id: string): boolean => UUID.test(id)

-- Apprenant anonyme : une ligne users sans email ni mot de passe.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- Ecrite a la main : Prisma ne sait pas l'exprimer. Pas d'email sans mot de passe, ni l'inverse.
ALTER TABLE "users"
  ADD CONSTRAINT "users_account_complete" CHECK (("email" IS NULL) = ("password_hash" IS NULL));

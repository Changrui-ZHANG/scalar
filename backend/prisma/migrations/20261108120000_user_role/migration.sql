-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('learner', 'admin');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "user_role" NOT NULL DEFAULT 'learner';

-- Ecrite a la main : Prisma ne sait pas l'exprimer. Un admin a toujours un compte (email et mot de passe).
ALTER TABLE "users"
  ADD CONSTRAINT "users_admin_has_account" CHECK ("role" = 'learner' OR "email" IS NOT NULL);

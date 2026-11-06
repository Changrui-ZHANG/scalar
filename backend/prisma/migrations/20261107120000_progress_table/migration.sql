-- Renommages seulement : les lignes deja enregistrees sont conservees.

ALTER TABLE "exercise_progress" RENAME TO "progress";
ALTER TABLE "progress" RENAME COLUMN "user_id" TO "user";
ALTER TABLE "progress" RENAME COLUMN "exercise_id" TO "exercise";

-- Prisma compare aussi les noms des contraintes et des index : ils suivent la table.
ALTER TABLE "progress" RENAME CONSTRAINT "exercise_progress_pkey" TO "progress_pkey";
ALTER TABLE "progress" RENAME CONSTRAINT "exercise_progress_user_id_fkey" TO "progress_user_fkey";
ALTER TABLE "progress" RENAME CONSTRAINT "exercise_progress_exercise_id_fkey" TO "progress_exercise_fkey";
ALTER TABLE "progress" RENAME CONSTRAINT "exercise_progress_attempts_positive" TO "progress_attempts_positive";
ALTER INDEX "exercise_progress_exercise_id_idx" RENAME TO "progress_exercise_idx";

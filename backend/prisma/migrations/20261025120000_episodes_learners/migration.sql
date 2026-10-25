-- Heritage EPISODE -> LECON / EXERCICE, tables de l'apprenant, du site et du
-- backoffice. Les donnees existantes sont reprises : les lecons gardent leur
-- id, les exercices sont decales apres la plus grande lecon ; dans un chapitre,
-- les exercices passent apres les lecons, comme le fil les affichait jusqu'ici.

-- CreateEnum
CREATE TYPE "episode_type" AS ENUM ('lesson', 'exercise');

-- CreateEnum
CREATE TYPE "verification_outcome" AS ENUM ('passed', 'failed_runtime', 'failed_missing_function', 'failed_case');

-- CreateEnum
CREATE TYPE "execution_status" AS ENUM ('OK', 'TO', 'OL', 'EL', 'RE', 'SG', 'XX');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('editor', 'reviewer', 'admin');

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "accent_color" TEXT,
ADD COLUMN     "seo_description" TEXT,
ADD COLUMN     "tagline" TEXT;

-- CreateTable
CREATE TABLE "episodes" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "type" "episode_type" NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "estimated_minutes" INTEGER,
    "seo_description" TEXT,
    "status" "publication_status" NOT NULL DEFAULT 'draft',
    "first_published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Reprise des lecons et des exercices dans `episodes`.
-- ---------------------------------------------------------------------------

CREATE TEMPORARY TABLE "_exercise_offset" AS
  SELECT COALESCE(MAX("id"), 0) AS "value" FROM "lessons";

INSERT INTO "episodes" ("id", "chapter_id", "type", "slug", "position", "title", "status", "first_published_at", "created_at", "updated_at")
SELECT "id", "chapter_id", 'lesson', "slug", "position", "title", "status", "first_published_at", "created_at", "updated_at"
FROM "lessons";

INSERT INTO "episodes" ("id", "chapter_id", "type", "slug", "position", "title", "status", "first_published_at", "created_at", "updated_at")
SELECT e."id" + o."value", e."chapter_id", 'exercise', e."slug",
       e."position" + COALESCE((SELECT MAX(l."position") FROM "lessons" l WHERE l."chapter_id" = e."chapter_id"), 0),
       e."title", e."status", e."first_published_at", e."created_at", e."updated_at"
FROM "exercises" e CROSS JOIN "_exercise_offset" o;

SELECT setval(pg_get_serial_sequence('episodes', 'id'), COALESCE((SELECT MAX("id") FROM "episodes"), 0) + 1, false);

-- Indices : un tableau devient une ligne par indice (premiere forme normale).
CREATE TABLE "exercise_hints" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "exercise_hints_pkey" PRIMARY KEY ("id")
);

INSERT INTO "exercise_hints" ("exercise_id", "position", "text")
SELECT e."id" + o."value", h."position", h."text"
FROM "exercises" e
CROSS JOIN "_exercise_offset" o
CROSS JOIN LATERAL unnest(e."hints") WITH ORDINALITY AS h("text", "position");

-- Les cas de test suivent leur exercice.
ALTER TABLE "exercise_test_cases" DROP CONSTRAINT "exercise_test_cases_exercise_id_fkey";
UPDATE "exercise_test_cases" SET "exercise_id" = "exercise_id" + (SELECT "value" FROM "_exercise_offset");

-- ---------------------------------------------------------------------------
-- Lecons et exercices : ne gardent que ce qui leur est propre.
-- ---------------------------------------------------------------------------

ALTER TABLE "lessons" DROP CONSTRAINT "lessons_chapter_id_fkey";
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_chapter_position_key";
DROP INDEX "lessons_chapter_id_slug_key";
ALTER TABLE "lessons" ADD COLUMN "episode_id" INTEGER;
UPDATE "lessons" SET "episode_id" = "id";
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_pkey",
DROP COLUMN "chapter_id",
DROP COLUMN "created_at",
DROP COLUMN "first_published_at",
DROP COLUMN "id",
DROP COLUMN "position",
DROP COLUMN "slug",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "updated_at",
ALTER COLUMN "episode_id" SET NOT NULL,
ADD COLUMN     "recap" TEXT,
ADD COLUMN     "type" "episode_type" NOT NULL DEFAULT 'lesson',
ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("episode_id");

ALTER TABLE "exercises" DROP CONSTRAINT "exercises_chapter_id_fkey";
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_chapter_position_key";
DROP INDEX "exercises_chapter_id_slug_key";
ALTER TABLE "exercises" ADD COLUMN "episode_id" INTEGER;
UPDATE "exercises" SET "episode_id" = "id" + (SELECT "value" FROM "_exercise_offset");
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_pkey",
DROP COLUMN "chapter_id",
DROP COLUMN "created_at",
DROP COLUMN "first_published_at",
DROP COLUMN "hints",
DROP COLUMN "id",
DROP COLUMN "position",
DROP COLUMN "slug",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "updated_at",
ALTER COLUMN "episode_id" SET NOT NULL,
ADD COLUMN     "related_lesson_id" INTEGER,
ADD COLUMN     "type" "episode_type" NOT NULL DEFAULT 'exercise',
ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("episode_id");

DROP TABLE "_exercise_offset";

-- ---------------------------------------------------------------------------
-- Nouvelles tables.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "lesson_objectives" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "lesson_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_enrollments" (
    "learner_id" UUID NOT NULL,
    "track_id" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_enrollments_pkey" PRIMARY KEY ("learner_id","track_id")
);

-- CreateTable
CREATE TABLE "episode_completions" (
    "learner_id" UUID NOT NULL,
    "episode_id" INTEGER NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_completions_pkey" PRIMARY KEY ("learner_id","episode_id")
);

-- CreateTable
CREATE TABLE "exercise_work" (
    "learner_id" UUID NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "draft_code" TEXT,
    "hints_revealed" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercise_work_pkey" PRIMARY KEY ("learner_id","exercise_id")
);

-- CreateTable
CREATE TABLE "lesson_feedbacks" (
    "learner_id" UUID NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_feedbacks_pkey" PRIMARY KEY ("learner_id","lesson_id")
);

-- CreateTable
CREATE TABLE "verification_attempts" (
    "id" SERIAL NOT NULL,
    "learner_id" UUID NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "outcome" "verification_outcome" NOT NULL,
    "passed_count" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "first_failed_case" INTEGER,
    "execution_status" "execution_status" NOT NULL,
    "cpu_time_ms" INTEGER,
    "wall_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions" (
    "id" SERIAL NOT NULL,
    "learner_id" UUID NOT NULL,
    "exercise_id" INTEGER,
    "programming_language" "programming_language" NOT NULL,
    "status" "execution_status" NOT NULL,
    "exit_code" INTEGER,
    "signal" TEXT,
    "cpu_time_ms" INTEGER,
    "wall_time_ms" INTEGER,
    "code_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "result_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slug_redirects" (
    "id" SERIAL NOT NULL,
    "old_path" TEXT NOT NULL,
    "new_path" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slug_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "admin_role" NOT NULL DEFAULT 'editor',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "episodes_chapter_id_slug_key" ON "episodes"("chapter_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_id_type_key" ON "episodes"("id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "learners_email_key" ON "learners"("email");

-- CreateIndex
CREATE INDEX "verification_attempts_exercise_id_created_at_idx" ON "verification_attempts"("exercise_id", "created_at");

-- CreateIndex
CREATE INDEX "executions_exercise_id_created_at_idx" ON "executions"("exercise_id", "created_at");

-- CreateIndex
CREATE INDEX "search_queries_result_count_created_at_idx" ON "search_queries"("result_count", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "slug_redirects_old_path_key" ON "slug_redirects"("old_path");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_episode_id_type_key" ON "exercises"("episode_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_episode_id_type_key" ON "lessons"("episode_id", "type");

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_episode_id_type_fkey" FOREIGN KEY ("episode_id", "type") REFERENCES "episodes"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_objectives" ADD CONSTRAINT "lesson_objectives_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("episode_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_episode_id_type_fkey" FOREIGN KEY ("episode_id", "type") REFERENCES "episodes"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_related_lesson_id_fkey" FOREIGN KEY ("related_lesson_id") REFERENCES "lessons"("episode_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_hints" ADD CONSTRAINT "exercise_hints_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("episode_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_test_cases" ADD CONSTRAINT "exercise_test_cases_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("episode_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_enrollments" ADD CONSTRAINT "track_enrollments_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_enrollments" ADD CONSTRAINT "track_enrollments_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_completions" ADD CONSTRAINT "episode_completions_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_completions" ADD CONSTRAINT "episode_completions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_work" ADD CONSTRAINT "exercise_work_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_work" ADD CONSTRAINT "exercise_work_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("episode_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_feedbacks" ADD CONSTRAINT "lesson_feedbacks_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_feedbacks" ADD CONSTRAINT "lesson_feedbacks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("episode_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_attempts" ADD CONSTRAINT "verification_attempts_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_attempts" ADD CONSTRAINT "verification_attempts_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("episode_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("episode_id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Contraintes ecrites a la main : Prisma ne sait pas les exprimer.
-- ---------------------------------------------------------------------------

-- Positions uniques dans leur parent, a controle differe (voir `*_init`).
ALTER TABLE "episodes"
  ADD CONSTRAINT "episodes_chapter_position_key" UNIQUE ("chapter_id", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "exercise_hints"
  ADD CONSTRAINT "exercise_hints_exercise_position_key" UNIQUE ("exercise_id", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "lesson_objectives"
  ADD CONSTRAINT "lesson_objectives_lesson_position_key" UNIQUE ("lesson_id", "position") DEFERRABLE INITIALLY DEFERRED;

-- Controles de contenu.
ALTER TABLE "exercise_hints"
  ADD CONSTRAINT "exercise_hints_position_range" CHECK ("position" BETWEEN 1 AND 3);
ALTER TABLE "exercise_work"
  ADD CONSTRAINT "exercise_work_hints_revealed_range" CHECK ("hints_revealed" BETWEEN 0 AND 3);
ALTER TABLE "verification_attempts"
  ADD CONSTRAINT "verification_attempts_counts" CHECK ("total" >= 1 AND "passed_count" BETWEEN 0 AND "total");
ALTER TABLE "executions"
  ADD CONSTRAINT "executions_code_bytes_positive" CHECK ("code_bytes" >= 0);

-- Heritage, exclusion : une specialisation ne porte que son propre type, et
-- sa cle etrangere (episode_id, type) interdit donc un episode d'un autre type.
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_type_is_lesson" CHECK ("type" = 'lesson');
ALTER TABLE "exercises"
  ADD CONSTRAINT "exercises_type_is_exercise" CHECK ("type" = 'exercise');

-- Heritage, totalite : en fin de transaction, chaque episode a sa specialisation.
CREATE FUNCTION "episode_has_specialization"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  "episode" "episodes"%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'episodes' THEN
    SELECT * INTO "episode" FROM "episodes" WHERE "id" = NEW."id";
  ELSE
    SELECT * INTO "episode" FROM "episodes" WHERE "id" = OLD."episode_id";
  END IF;
  -- Episode supprime entre-temps : rien a verifier.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF ("episode"."type" = 'lesson' AND NOT EXISTS (SELECT 1 FROM "lessons" WHERE "episode_id" = "episode"."id"))
     OR ("episode"."type" = 'exercise' AND NOT EXISTS (SELECT 1 FROM "exercises" WHERE "episode_id" = "episode"."id")) THEN
    RAISE EXCEPTION 'L''episode % (%) n''a pas de ligne dans sa table de specialisation', "episode"."id", "episode"."type"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "episodes_have_specialization"
  AFTER INSERT OR UPDATE OF "type" ON "episodes"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "episode_has_specialization"();
CREATE CONSTRAINT TRIGGER "lessons_keep_their_episode_whole"
  AFTER DELETE ON "lessons"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "episode_has_specialization"();
CREATE CONSTRAINT TRIGGER "exercises_keep_their_episode_whole"
  AFTER DELETE ON "exercises"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "episode_has_specialization"();

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "chapter_level" AS ENUM ('beginner', 'intermediate', 'advanced', 'ecosystem');

-- CreateEnum
CREATE TYPE "programming_language" AS ENUM ('javascript', 'typescript');

-- CreateEnum
CREATE TYPE "solution_check_status" AS ENUM ('not_checked', 'passed', 'failed');

-- CreateTable
CREATE TABLE "tracks" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "programming_language" "programming_language",
    "prerequisite_track_id" INTEGER,
    "status" "publication_status" NOT NULL DEFAULT 'draft',
    "first_published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" SERIAL NOT NULL,
    "track_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "level" "chapter_level" NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "publication_status" NOT NULL DEFAULT 'draft',
    "first_published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "status" "publication_status" NOT NULL DEFAULT 'draft',
    "first_published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "function_name" TEXT NOT NULL,
    "starter_code" TEXT NOT NULL,
    "solution_code" TEXT NOT NULL,
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "solution_check_status" "solution_check_status" NOT NULL DEFAULT 'not_checked',
    "solution_checked_at" TIMESTAMPTZ(6),
    "status" "publication_status" NOT NULL DEFAULT 'draft',
    "first_published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_test_cases" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "arguments" JSONB NOT NULL,
    "expected_result" JSONB NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercise_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracks_slug_key" ON "tracks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_track_id_slug_key" ON "chapters"("track_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_chapter_id_slug_key" ON "lessons"("chapter_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_chapter_id_slug_key" ON "exercises"("chapter_id", "slug");

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_prerequisite_track_id_fkey" FOREIGN KEY ("prerequisite_track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_test_cases" ADD CONSTRAINT "exercise_test_cases_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Contraintes ecrites a la main : Prisma ne sait pas les exprimer.
-- ---------------------------------------------------------------------------

-- Positions uniques dans leur parent, a controle differe : echanger deux
-- elements ne viole la contrainte qu'en fin de transaction, pas a mi-chemin.
-- Les chapitres sont ordonnes dans leur niveau.
ALTER TABLE "tracks"
  ADD CONSTRAINT "tracks_position_key" UNIQUE ("position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "chapters"
  ADD CONSTRAINT "chapters_track_level_position_key" UNIQUE ("track_id", "level", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_chapter_position_key" UNIQUE ("chapter_id", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "exercises"
  ADD CONSTRAINT "exercises_chapter_position_key" UNIQUE ("chapter_id", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "exercise_test_cases"
  ADD CONSTRAINT "exercise_test_cases_exercise_position_key" UNIQUE ("exercise_id", "position") DEFERRABLE INITIALLY DEFERRED;

-- Controles de contenu.
ALTER TABLE "tracks"
  ADD CONSTRAINT "tracks_not_own_prerequisite" CHECK ("prerequisite_track_id" <> "id");
ALTER TABLE "exercises"
  ADD CONSTRAINT "exercises_hints_max" CHECK (cardinality("hints") <= 3);
ALTER TABLE "exercise_test_cases"
  ADD CONSTRAINT "exercise_test_cases_arguments_array" CHECK (jsonb_typeof("arguments") = 'array');

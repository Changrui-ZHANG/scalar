-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "language_runtime" AS ENUM ('node', 'node_strip_types');

-- CreateEnum
CREATE TYPE "category_scope" AS ENUM ('per_language', 'all_languages');

-- CreateTable
CREATE TABLE "languages" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "runtime" "language_runtime" NOT NULL,
    "prerequisite_language_id" INTEGER,
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" SERIAL NOT NULL,
    "language_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "function_name" TEXT NOT NULL,
    "starter_code" TEXT NOT NULL,
    "solution_code" TEXT NOT NULL,
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_test_cases" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "args" JSONB NOT NULL,
    "expected" JSONB NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercise_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "scope" "category_scope" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lesson_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "language_id" INTEGER,
    "category_id" INTEGER NOT NULL,
    "category_scope" "category_scope" NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6),
    "status" "content_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_chapters" (
    "lesson_id" INTEGER NOT NULL,
    "chapter_id" INTEGER NOT NULL,

    CONSTRAINT "lesson_chapters_pkey" PRIMARY KEY ("lesson_id","chapter_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_slug_key" ON "languages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_language_id_slug_key" ON "chapters"("language_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_chapter_id_slug_key" ON "exercises"("chapter_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_categories_slug_key" ON "lesson_categories"("slug");

-- AddForeignKey
ALTER TABLE "languages" ADD CONSTRAINT "languages_prerequisite_language_id_fkey" FOREIGN KEY ("prerequisite_language_id") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_test_cases" ADD CONSTRAINT "exercise_test_cases_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lesson_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_chapters" ADD CONSTRAINT "lesson_chapters_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_chapters" ADD CONSTRAINT "lesson_chapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Contraintes ecrites a la main : Prisma ne sait pas les exprimer.
-- ---------------------------------------------------------------------------

-- Positions uniques dans leur parent, a controle differe : echanger deux
-- elements ne viole la contrainte qu'en fin de transaction, pas a mi-chemin.
ALTER TABLE "languages"
  ADD CONSTRAINT "languages_position_key" UNIQUE ("position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "lesson_categories"
  ADD CONSTRAINT "lesson_categories_position_key" UNIQUE ("position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "chapters"
  ADD CONSTRAINT "chapters_language_position_key" UNIQUE ("language_id", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "exercises"
  ADD CONSTRAINT "exercises_chapter_position_key" UNIQUE ("chapter_id", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "exercise_test_cases"
  ADD CONSTRAINT "exercise_test_cases_exercise_position_key" UNIQUE ("exercise_id", "position") DEFERRABLE INITIALLY DEFERRED;

-- Lecons : slug unique par langage, position unique par langage et categorie.
-- NULLS NOT DISTINCT : deux lecons « tous langages » (language_id nul) ne
-- partagent ni un slug ni une position.
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_language_slug_key" UNIQUE NULLS NOT DISTINCT ("language_id", "slug");
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_language_category_position_key"
  UNIQUE NULLS NOT DISTINCT ("language_id", "category_id", "position") DEFERRABLE INITIALLY DEFERRED;

-- « Tous langages <=> sans langage », verifie par la base : la lecon recopie la
-- portee de sa categorie, et la cle composee interdit toute copie infidele.
ALTER TABLE "lesson_categories"
  ADD CONSTRAINT "lesson_categories_id_scope_key" UNIQUE ("id", "scope");
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_category_scope_fkey" FOREIGN KEY ("category_id", "category_scope")
  REFERENCES "lesson_categories" ("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_language_matches_scope"
  CHECK (("category_scope" = 'all_languages') = ("language_id" IS NULL));

-- Controles de contenu.
ALTER TABLE "exercises"
  ADD CONSTRAINT "exercises_hints_max" CHECK (cardinality("hints") <= 3);
ALTER TABLE "exercise_test_cases"
  ADD CONSTRAINT "exercise_test_cases_args_array" CHECK (jsonb_typeof("args") = 'array');
ALTER TABLE "languages"
  ADD CONSTRAINT "languages_not_own_prerequisite" CHECK ("prerequisite_language_id" <> "id");

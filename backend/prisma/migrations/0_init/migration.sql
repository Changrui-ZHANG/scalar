-- CreateEnum
CREATE TYPE "language" AS ENUM ('javascript');

-- CreateTable
CREATE TABLE "chapters" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "language" "language" NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "lesson" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "function_name" TEXT NOT NULL,
    "starter_code" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tests" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "exercises_hints_max" CHECK (cardinality("hints") <= 3),
    CONSTRAINT "exercises_tests_not_empty" CHECK (jsonb_typeof("tests") = 'array' AND jsonb_array_length("tests") >= 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "chapters_slug_key" ON "chapters"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_language_position_unique" ON "chapters"("language", "position");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_chapter_id_position_unique" ON "exercises"("chapter_id", "position");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

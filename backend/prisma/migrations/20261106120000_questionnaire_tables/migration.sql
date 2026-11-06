-- CreateEnum
CREATE TYPE "questionnaire_question_kind" AS ENUM ('experience', 'language', 'knowledge', 'code');

-- CreateTable
CREATE TABLE "question" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "questionnaire_question_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "function_name" TEXT,
    "starter_code" TEXT,
    "solution_code" TEXT,
    "status" "publication_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option" (
    "id" SERIAL NOT NULL,
    "question" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "track_slug" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testCase" (
    "id" SERIAL NOT NULL,
    "question" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "arguments" JSONB NOT NULL,
    "expected_result" JSONB NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "testCase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "option" ADD CONSTRAINT "option_question_fkey" FOREIGN KEY ("question") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testCase" ADD CONSTRAINT "testCase_question_fkey" FOREIGN KEY ("question") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Contraintes ecrites a la main : Prisma ne sait pas les exprimer.
-- ---------------------------------------------------------------------------

-- Positions uniques a controle differe, comme pour le contenu (migration `*_init`).
ALTER TABLE "question"
  ADD CONSTRAINT "question_position_key" UNIQUE ("position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "option"
  ADD CONSTRAINT "option_question_position_key" UNIQUE ("question", "position") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "testCase"
  ADD CONSTRAINT "testCase_question_position_key" UNIQUE ("question", "position") DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "question"
  ADD CONSTRAINT "question_weight_positive" CHECK ("weight" >= 1);
ALTER TABLE "question"
  ADD CONSTRAINT "question_code_fields" CHECK (
    CASE WHEN "kind" = 'code'
      THEN "function_name" IS NOT NULL AND "starter_code" IS NOT NULL AND "solution_code" IS NOT NULL
      ELSE "function_name" IS NULL AND "starter_code" IS NULL AND "solution_code" IS NULL
    END
  );
ALTER TABLE "option"
  ADD CONSTRAINT "option_score_range" CHECK ("score" >= 0 AND "score" <= 1);
ALTER TABLE "testCase"
  ADD CONSTRAINT "testCase_arguments_array" CHECK (jsonb_typeof("arguments") = 'array');

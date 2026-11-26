-- Lecons terminees par un apprenant (anonyme ou inscrit).
-- Prisma propose aussi de supprimer les unicites differees ecrites a la main
-- dans `*_init` : ces lignes sont retirees, comme dans les migrations precedentes.

-- CreateTable
CREATE TABLE "lesson_progress" (
    "user" UUID NOT NULL,
    "lesson" INTEGER NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("user","lesson")
);

-- CreateIndex
CREATE INDEX "lesson_progress_lesson_idx" ON "lesson_progress"("lesson");

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_fkey" FOREIGN KEY ("lesson") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

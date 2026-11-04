-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_progress" (
    "user_id" UUID NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL,
    "first_passed_at" TIMESTAMPTZ(6),
    "last_attempt_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exercise_progress_pkey" PRIMARY KEY ("user_id","exercise_id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "track_id" INTEGER NOT NULL,
    "holder_name" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "exercise_progress_exercise_id_idx" ON "exercise_progress"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE INDEX "certificates_track_id_idx" ON "certificates"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_user_id_track_id_key" ON "certificates"("user_id", "track_id");

-- AddForeignKey
ALTER TABLE "exercise_progress" ADD CONSTRAINT "exercise_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_progress" ADD CONSTRAINT "exercise_progress_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Contraintes ecrites a la main : Prisma ne sait pas les exprimer.
-- ---------------------------------------------------------------------------

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "users"
  ADD CONSTRAINT "users_token_version_non_negative" CHECK ("token_version" >= 0);
ALTER TABLE "exercise_progress"
  ADD CONSTRAINT "exercise_progress_attempts_positive" CHECK ("attempts" >= 1);
ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_holder_name_not_blank" CHECK (btrim("holder_name") <> '');

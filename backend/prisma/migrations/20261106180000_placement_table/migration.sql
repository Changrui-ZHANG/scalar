-- CreateTable
CREATE TABLE "placement" (
    "id" SERIAL NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "chapter_level" NOT NULL,
    "track" INTEGER NOT NULL,
    "declared" DOUBLE PRECISION NOT NULL,
    "knowledge" DOUBLE PRECISION NOT NULL,
    "practical" DOUBLE PRECISION NOT NULL,
    "user" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "placement_track_idx" ON "placement"("track");

-- CreateIndex
CREATE INDEX "placement_user_idx" ON "placement"("user");

-- AddForeignKey
ALTER TABLE "placement" ADD CONSTRAINT "placement_track_fkey" FOREIGN KEY ("track") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement" ADD CONSTRAINT "placement_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Contraintes ecrites a la main : Prisma ne sait pas les exprimer.
-- ---------------------------------------------------------------------------

ALTER TABLE "placement"
  ADD CONSTRAINT "placement_score_range" CHECK ("score" BETWEEN 0 AND 100);
ALTER TABLE "placement"
  ADD CONSTRAINT "placement_level_not_ecosystem" CHECK ("level" <> 'ecosystem');
ALTER TABLE "placement"
  ADD CONSTRAINT "placement_subscores_range" CHECK (
    "declared" BETWEEN 0 AND 1 AND "knowledge" BETWEEN 0 AND 1 AND "practical" BETWEEN 0 AND 1
  );

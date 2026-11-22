-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('monthly', 'yearly');

-- CreateTable
CREATE TABLE "subscription" (
    "id" SERIAL NOT NULL,
    "user" UUID NOT NULL,
    "status" "subscription_status" NOT NULL,
    "plan" "subscription_plan" NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_user_key" ON "subscription"("user");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripe_subscription_id_key" ON "subscription"("stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

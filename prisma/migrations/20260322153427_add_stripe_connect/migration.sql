/*
  Warnings:

  - A unique constraint covering the columns `[stripe_payment_intent_id]` on the table `marketplace_purchases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_connect_account_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "marketplace_purchases" ADD COLUMN     "stripe_payment_intent_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_connect_account_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_purchases_stripe_payment_intent_id_key" ON "marketplace_purchases"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_connect_account_id_key" ON "users"("stripe_connect_account_id");

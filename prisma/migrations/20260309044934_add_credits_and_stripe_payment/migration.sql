/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BillingProductType" AS ENUM ('TOP_UP', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('ONE_TIME', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "BillingCheckoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "StripeWebhookEventStatus" AS ENUM ('PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "CreditLedgerEntryType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT', 'EXPIRE');

-- CreateEnum
CREATE TYPE "CreditLedgerEntrySource" AS ENUM ('TOP_UP', 'MEMBERSHIP', 'AI_USAGE', 'MANUAL_ADJUSTMENT', 'REFUND', 'PROMOTION');

-- CreateEnum
CREATE TYPE "AiUsageStatus" AS ENUM ('COMPLETED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_customer_id" TEXT;

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance_microcredits" BIGINT NOT NULL DEFAULT 0,
    "lifetime_credited_microcredits" BIGINT NOT NULL DEFAULT 0,
    "lifetime_debited_microcredits" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BillingProductType" NOT NULL,
    "billing_interval" "BillingInterval" NOT NULL DEFAULT 'ONE_TIME',
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "unit_amount" INTEGER NOT NULL,
    "credits_microcredits" BIGINT NOT NULL,
    "bonus_microcredits" BIGINT NOT NULL DEFAULT 0,
    "stripe_product_id" TEXT,
    "stripe_price_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_checkout_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "stripe_checkout_session_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_invoice_id" TEXT,
    "status" "BillingCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "amount_total" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "credits_granted_microcredits" BIGINT NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_latest_invoice_id" TEXT,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "StripeWebhookEventStatus" NOT NULL DEFAULT 'PROCESSED',
    "payload" JSONB,
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_pricing" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "display_name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "prompt_microcredits_per_million" BIGINT NOT NULL DEFAULT 0,
    "completion_microcredits_per_million" BIGINT NOT NULL DEFAULT 0,
    "cache_write_microcredits_per_million" BIGINT NOT NULL DEFAULT 0,
    "cache_read_microcredits_per_million" BIGINT NOT NULL DEFAULT 0,
    "minimum_charge_microcredits" BIGINT NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "pricing_id" TEXT,
    "external_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" BIGINT NOT NULL DEFAULT 0,
    "output_tokens" BIGINT NOT NULL DEFAULT 0,
    "cache_write_tokens" BIGINT NOT NULL DEFAULT 0,
    "cache_read_tokens" BIGINT NOT NULL DEFAULT 0,
    "total_tokens" BIGINT NOT NULL DEFAULT 0,
    "charged_microcredits" BIGINT NOT NULL DEFAULT 0,
    "status" "AiUsageStatus" NOT NULL DEFAULT 'COMPLETED',
    "pricing_snapshot" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "ai_usage_id" TEXT,
    "checkout_session_id" TEXT,
    "subscription_id" TEXT,
    "type" "CreditLedgerEntryType" NOT NULL,
    "source" "CreditLedgerEntrySource" NOT NULL,
    "source_ref" TEXT,
    "amount_microcredits" BIGINT NOT NULL,
    "balance_after_microcredits" BIGINT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_user_id_key" ON "billing_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_products_code_key" ON "credit_products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "credit_products_stripe_price_id_key" ON "credit_products"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkout_sessions_stripe_checkout_session_id_key" ON "billing_checkout_sessions"("stripe_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkout_sessions_stripe_payment_intent_id_key" ON "billing_checkout_sessions"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkout_sessions_stripe_invoice_id_key" ON "billing_checkout_sessions"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "billing_checkout_sessions_user_id_status_idx" ON "billing_checkout_sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_stripe_subscription_id_key" ON "billing_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "billing_subscriptions_user_id_status_idx" ON "billing_subscriptions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "ai_model_pricing_active_idx" ON "ai_model_pricing"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_pricing_provider_model_key" ON "ai_model_pricing"("provider", "model");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_records_external_id_key" ON "ai_usage_records"("external_id");

-- CreateIndex
CREATE INDEX "ai_usage_records_user_id_created_at_idx" ON "ai_usage_records"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_records_provider_model_idx" ON "ai_usage_records"("provider", "model");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_entries_ai_usage_id_key" ON "credit_ledger_entries"("ai_usage_id");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_user_id_created_at_idx" ON "credit_ledger_entries"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_entries_source_source_ref_key" ON "credit_ledger_entries"("source", "source_ref");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "credit_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "credit_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_pricing_id_fkey" FOREIGN KEY ("pricing_id") REFERENCES "ai_model_pricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_ai_usage_id_fkey" FOREIGN KEY ("ai_usage_id") REFERENCES "ai_usage_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "billing_checkout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

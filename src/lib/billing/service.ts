import {
  BillingInterval,
  BillingProductType,
  BillingSubscriptionStatus,
  CreditLedgerEntrySource,
  CreditLedgerEntryType,
  Prisma,
} from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  TOKENS_PER_MILLION,
  coerceBigInt,
  creditsToMicrocredits,
  divideAndRoundUp,
  microcreditsToCreditsString,
  serializeCredits,
} from "./units";

type DbClient = typeof prisma | Prisma.TransactionClient;

type BillingAccountRecord = {
  id: string;
  userId: string;
  balanceMicrocredits: bigint;
  lifetimeCreditedMicrocredits: bigint;
  lifetimeDebitedMicrocredits: bigint;
};

type CreditProductRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: BillingProductType;
  billingInterval: BillingInterval;
  currency: string;
  unitAmount: number;
  creditsMicrocredits: bigint;
  bonusMicrocredits: bigint;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
  sortOrder: number;
  metadata: Prisma.JsonValue | null;
};

type AiModelPricingRecord = {
  id: string;
  provider: string;
  model: string;
  displayName: string | null;
  active: boolean;
  promptMicrocreditsPerMillion: bigint;
  completionMicrocreditsPerMillion: bigint;
  cacheWriteMicrocreditsPerMillion: bigint;
  cacheReadMicrocreditsPerMillion: bigint;
  minimumChargeMicrocredits: bigint;
  metadata: Prisma.JsonValue | null;
};

type AiUsageCostBreakdown = {
  inputMicrocredits: bigint;
  outputMicrocredits: bigint;
  cacheWriteMicrocredits: bigint;
  cacheReadMicrocredits: bigint;
  subtotalMicrocredits: bigint;
  totalMicrocredits: bigint;
};

export type AiUsageInput = {
  inputTokens?: bigint | number | string | null;
  outputTokens?: bigint | number | string | null;
  cacheWriteTokens?: bigint | number | string | null;
  cacheReadTokens?: bigint | number | string | null;
};

export type ChargeAiUsageInput = {
  userId: string;
  provider: string;
  model: string;
  usage: AiUsageInput;
  apiKeyId?: string | null;
  externalId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export type UpsertCreditProductInput = {
  code: string;
  name: string;
  description?: string | null;
  type: BillingProductType;
  billingInterval?: BillingInterval;
  currency?: string;
  unitAmount: number;
  credits: string | number;
  bonusCredits?: string | number;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
  active?: boolean;
  sortOrder?: number;
  metadata?: Prisma.InputJsonValue | null;
};

export type UpsertAiModelPricingInput = {
  provider: string;
  model: string;
  displayName?: string | null;
  active?: boolean;
  promptCreditsPerMillion: string | number;
  completionCreditsPerMillion: string | number;
  cacheWriteCreditsPerMillion?: string | number;
  cacheReadCreditsPerMillion?: string | number;
  minimumChargeCredits?: string | number;
  metadata?: Prisma.InputJsonValue | null;
};

export class BillingConfigError extends Error {}
export class InsufficientCreditsError extends Error {}
export class MissingModelPricingError extends Error {}

function withOptionalJson(field: string, value: Prisma.InputJsonValue | null | undefined) {
  if (value === undefined) return {};
  return { [field]: value === null ? Prisma.DbNull : value };
}

function toDate(timestamp: number | null | undefined) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000);
}

function getStripeObjectId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function productGrantMicrocredits(product: CreditProductRecord) {
  return product.creditsMicrocredits + product.bonusMicrocredits;
}

function serializeBillingAccount(account: BillingAccountRecord) {
  return {
    accountId: account.id,
    userId: account.userId,
    balance: serializeCredits(account.balanceMicrocredits),
    lifetimeCredited: serializeCredits(account.lifetimeCreditedMicrocredits),
    lifetimeDebited: serializeCredits(account.lifetimeDebitedMicrocredits),
  };
}

function serializeCreditProduct(product: CreditProductRecord) {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    type: product.type,
    billingInterval: product.billingInterval,
    currency: product.currency,
    unitAmount: product.unitAmount,
    active: product.active,
    sortOrder: product.sortOrder,
    stripeProductId: product.stripeProductId,
    stripePriceId: product.stripePriceId,
    baseCredits: serializeCredits(product.creditsMicrocredits),
    bonusCredits: serializeCredits(product.bonusMicrocredits),
    totalCredits: serializeCredits(productGrantMicrocredits(product)),
    metadata: product.metadata,
  };
}

function serializeAiModelPricing(pricing: AiModelPricingRecord) {
  return {
    id: pricing.id,
    provider: pricing.provider,
    model: pricing.model,
    displayName: pricing.displayName,
    active: pricing.active,
    rates: {
      prompt: serializeCredits(pricing.promptMicrocreditsPerMillion),
      completion: serializeCredits(pricing.completionMicrocreditsPerMillion),
      cacheWrite: serializeCredits(pricing.cacheWriteMicrocreditsPerMillion),
      cacheRead: serializeCredits(pricing.cacheReadMicrocreditsPerMillion),
      minimumCharge: serializeCredits(pricing.minimumChargeMicrocredits),
      unit: "per_1m_tokens",
    },
    metadata: pricing.metadata,
  };
}

function serializeUsageCostBreakdown(cost: AiUsageCostBreakdown) {
  return {
    input: serializeCredits(cost.inputMicrocredits),
    output: serializeCredits(cost.outputMicrocredits),
    cacheWrite: serializeCredits(cost.cacheWriteMicrocredits),
    cacheRead: serializeCredits(cost.cacheReadMicrocredits),
    subtotal: serializeCredits(cost.subtotalMicrocredits),
    total: serializeCredits(cost.totalMicrocredits),
  };
}

function normalizeUsage(usage: AiUsageInput) {
  const inputTokens = coerceBigInt(usage.inputTokens);
  const outputTokens = coerceBigInt(usage.outputTokens);
  const cacheWriteTokens = coerceBigInt(usage.cacheWriteTokens);
  const cacheReadTokens = coerceBigInt(usage.cacheReadTokens);

  return {
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    totalTokens: inputTokens + outputTokens + cacheWriteTokens + cacheReadTokens,
  };
}

function calculateUsageCost(
  pricing: AiModelPricingRecord,
  usage: ReturnType<typeof normalizeUsage>
): AiUsageCostBreakdown {
  const inputMicrocredits = divideAndRoundUp(
    usage.inputTokens * pricing.promptMicrocreditsPerMillion,
    TOKENS_PER_MILLION
  );
  const outputMicrocredits = divideAndRoundUp(
    usage.outputTokens * pricing.completionMicrocreditsPerMillion,
    TOKENS_PER_MILLION
  );
  const cacheWriteMicrocredits = divideAndRoundUp(
    usage.cacheWriteTokens * pricing.cacheWriteMicrocreditsPerMillion,
    TOKENS_PER_MILLION
  );
  const cacheReadMicrocredits = divideAndRoundUp(
    usage.cacheReadTokens * pricing.cacheReadMicrocreditsPerMillion,
    TOKENS_PER_MILLION
  );
  const subtotalMicrocredits =
    inputMicrocredits +
    outputMicrocredits +
    cacheWriteMicrocredits +
    cacheReadMicrocredits;

  const hasUsage = usage.totalTokens > BigInt(0);
  const totalMicrocredits =
    hasUsage && subtotalMicrocredits < pricing.minimumChargeMicrocredits
      ? pricing.minimumChargeMicrocredits
      : subtotalMicrocredits;

  return {
    inputMicrocredits,
    outputMicrocredits,
    cacheWriteMicrocredits,
    cacheReadMicrocredits,
    subtotalMicrocredits,
    totalMicrocredits,
  };
}

function createUsagePricingSnapshot(
  pricing: AiModelPricingRecord,
  usage: ReturnType<typeof normalizeUsage>,
  cost: AiUsageCostBreakdown
): Prisma.InputJsonValue {
  return {
    provider: pricing.provider,
    model: pricing.model,
    displayName: pricing.displayName,
    usage: {
      inputTokens: usage.inputTokens.toString(),
      outputTokens: usage.outputTokens.toString(),
      cacheWriteTokens: usage.cacheWriteTokens.toString(),
      cacheReadTokens: usage.cacheReadTokens.toString(),
      totalTokens: usage.totalTokens.toString(),
    },
    unit: "per_1m_tokens",
    rates: {
      promptMicrocreditsPerMillion: pricing.promptMicrocreditsPerMillion.toString(),
      completionMicrocreditsPerMillion:
        pricing.completionMicrocreditsPerMillion.toString(),
      cacheWriteMicrocreditsPerMillion:
        pricing.cacheWriteMicrocreditsPerMillion.toString(),
      cacheReadMicrocreditsPerMillion:
        pricing.cacheReadMicrocreditsPerMillion.toString(),
      minimumChargeMicrocredits: pricing.minimumChargeMicrocredits.toString(),
      promptCreditsPerMillion: microcreditsToCreditsString(
        pricing.promptMicrocreditsPerMillion
      ),
      completionCreditsPerMillion: microcreditsToCreditsString(
        pricing.completionMicrocreditsPerMillion
      ),
      cacheWriteCreditsPerMillion: microcreditsToCreditsString(
        pricing.cacheWriteMicrocreditsPerMillion
      ),
      cacheReadCreditsPerMillion: microcreditsToCreditsString(
        pricing.cacheReadMicrocreditsPerMillion
      ),
      minimumChargeCredits: microcreditsToCreditsString(
        pricing.minimumChargeMicrocredits
      ),
    },
    charge: {
      inputMicrocredits: cost.inputMicrocredits.toString(),
      outputMicrocredits: cost.outputMicrocredits.toString(),
      cacheWriteMicrocredits: cost.cacheWriteMicrocredits.toString(),
      cacheReadMicrocredits: cost.cacheReadMicrocredits.toString(),
      subtotalMicrocredits: cost.subtotalMicrocredits.toString(),
      totalMicrocredits: cost.totalMicrocredits.toString(),
      totalCredits: microcreditsToCreditsString(cost.totalMicrocredits),
    },
  };
}

async function ensureBillingAccount(userId: string, db: DbClient = prisma) {
  return db.billingAccount.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function findProductByLookup(input: { productId?: string; productCode?: string }) {
  if (input.productId) {
    return prisma.creditProduct.findFirst({
      where: { id: input.productId },
    });
  }

  if (input.productCode) {
    return prisma.creditProduct.findFirst({
      where: { code: input.productCode },
    });
  }

  return null;
}

async function getOrCreateStripeCustomer(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.name || undefined,
    metadata: {
      userId: user.id,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "trialing":
      return BillingSubscriptionStatus.TRIALING;
    case "active":
      return BillingSubscriptionStatus.ACTIVE;
    case "past_due":
      return BillingSubscriptionStatus.PAST_DUE;
    case "canceled":
      return BillingSubscriptionStatus.CANCELED;
    case "unpaid":
      return BillingSubscriptionStatus.UNPAID;
    case "paused":
      return BillingSubscriptionStatus.PAUSED;
    case "incomplete":
    case "incomplete_expired":
    default:
      return BillingSubscriptionStatus.INCOMPLETE;
  }
}

function stringifyStripeObject(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function syncBillingSubscriptionFromStripeSubscription(
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    throw new BillingConfigError("Stripe subscription is missing a price");
  }
  const stripeCustomerId = getStripeObjectId(
    subscription.customer as string | { id: string } | null | undefined
  );
  if (!stripeCustomerId) {
    throw new BillingConfigError("Stripe subscription is missing a customer");
  }

  const product = await prisma.creditProduct.findFirst({
    where: {
      stripePriceId: priceId,
      type: BillingProductType.MEMBERSHIP,
    },
  });

  if (!product) {
    throw new BillingConfigError(
      `No membership credit product is configured for Stripe price ${priceId}`
    );
  }

  const userId =
    subscription.metadata.userId ||
    (
      await prisma.user.findFirst({
        where: { stripeCustomerId },
        select: { id: true },
      })
    )?.id;

  if (!userId) {
    throw new BillingConfigError(
      `Unable to resolve user for Stripe customer ${stripeCustomerId}`
    );
  }

  const billingAccount = await ensureBillingAccount(userId);

  return prisma.billingSubscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      billingAccountId: billingAccount.id,
      productId: product.id,
      stripeCustomerId,
      stripeLatestInvoiceId:
        typeof subscription.latest_invoice === "string"
          ? subscription.latest_invoice
          : subscription.latest_invoice?.id || null,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: toDate(
        subscription.items.data[0]?.current_period_start
      ),
      currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? toDate(subscription.canceled_at) : null,
      metadata: stringifyStripeObject(subscription.metadata),
    },
    create: {
      userId,
      billingAccountId: billingAccount.id,
      productId: product.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      stripeLatestInvoiceId:
        typeof subscription.latest_invoice === "string"
          ? subscription.latest_invoice
          : subscription.latest_invoice?.id || null,
      status: mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: toDate(
        subscription.items.data[0]?.current_period_start
      ),
      currentPeriodEnd: toDate(subscription.items.data[0]?.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? toDate(subscription.canceled_at) : null,
      metadata: stringifyStripeObject(subscription.metadata),
    },
  });
}

async function syncBillingSubscriptionByStripeId(subscriptionId: string) {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price", "latest_invoice"],
  });

  return syncBillingSubscriptionFromStripeSubscription(subscription);
}

async function getOrCreateCheckoutRecord(stripeSession: Stripe.Checkout.Session) {
  const existing = await prisma.billingCheckoutSession.findUnique({
    where: { stripeCheckoutSessionId: stripeSession.id },
    include: { product: true },
  });

  if (existing) return existing;

  const userId = stripeSession.metadata?.userId;
  const productId = stripeSession.metadata?.productId || null;
  const billingAccountId = stripeSession.metadata?.billingAccountId;

  if (!userId || !billingAccountId) {
    throw new BillingConfigError(
      `Stripe checkout session ${stripeSession.id} is missing billing metadata`
    );
  }

  await prisma.billingCheckoutSession.create({
    data: {
      userId,
      billingAccountId,
      productId,
      stripeCheckoutSessionId: stripeSession.id,
      stripePaymentIntentId:
        typeof stripeSession.payment_intent === "string"
          ? stripeSession.payment_intent
          : stripeSession.payment_intent?.id || null,
      stripeInvoiceId:
        typeof stripeSession.invoice === "string"
          ? stripeSession.invoice
          : stripeSession.invoice?.id || null,
      status: stripeSession.status === "complete" ? "COMPLETED" : "PENDING",
      amountTotal: stripeSession.amount_total ?? null,
      currency: stripeSession.currency || "usd",
      expiresAt: toDate(stripeSession.expires_at),
      metadata: stringifyStripeObject(stripeSession.metadata || {}),
    },
  });

  return prisma.billingCheckoutSession.findUniqueOrThrow({
    where: { stripeCheckoutSessionId: stripeSession.id },
    include: { product: true },
  });
}

export async function getCreditBalanceSummary(userId: string) {
  const account = await ensureBillingAccount(userId);
  return serializeBillingAccount(account);
}

export async function getCreditBalanceMicrocredits(userId: string) {
  const account = await ensureBillingAccount(userId);
  return account.balanceMicrocredits;
}

export async function requireCreditBalanceAtLeast(
  userId: string,
  amountMicrocredits: bigint
) {
  const account = await ensureBillingAccount(userId);

  if (account.balanceMicrocredits < amountMicrocredits) {
    throw new InsufficientCreditsError(
      `Insufficient credits. Required ${microcreditsToCreditsString(amountMicrocredits)}, available ${microcreditsToCreditsString(account.balanceMicrocredits)}.`
    );
  }

  return serializeBillingAccount(account);
}

export async function listRecentLedgerEntries(userId: string, limit = 20) {
  const entries = await prisma.creditLedgerEntry.findMany({
    where: { userId },
    include: {
      aiUsage: {
        select: {
          provider: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          cacheWriteTokens: true,
          cacheReadTokens: true,
        },
      },
      checkoutSession: {
        select: {
          stripeCheckoutSessionId: true,
        },
      },
      subscription: {
        select: {
          stripeSubscriptionId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    source: entry.source,
    sourceRef: entry.sourceRef,
    description: entry.description,
    amount: serializeCredits(entry.amountMicrocredits),
    balanceAfter: serializeCredits(entry.balanceAfterMicrocredits),
    aiUsage: entry.aiUsage
      ? {
          provider: entry.aiUsage.provider,
          model: entry.aiUsage.model,
          inputTokens: entry.aiUsage.inputTokens.toString(),
          outputTokens: entry.aiUsage.outputTokens.toString(),
          cacheWriteTokens: entry.aiUsage.cacheWriteTokens.toString(),
          cacheReadTokens: entry.aiUsage.cacheReadTokens.toString(),
        }
      : null,
    checkoutSessionId: entry.checkoutSession?.stripeCheckoutSessionId || null,
    subscriptionId: entry.subscription?.stripeSubscriptionId || null,
    metadata: entry.metadata,
    createdAt: entry.createdAt.toISOString(),
  }));
}

export async function listRecentAiUsageRecords(userId: string, limit = 20) {
  const usageRecords = await prisma.aiUsageRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return usageRecords.map((record) => ({
    id: record.id,
    externalId: record.externalId,
    provider: record.provider,
    model: record.model,
    status: record.status,
    inputTokens: record.inputTokens.toString(),
    outputTokens: record.outputTokens.toString(),
    cacheWriteTokens: record.cacheWriteTokens.toString(),
    cacheReadTokens: record.cacheReadTokens.toString(),
    totalTokens: record.totalTokens.toString(),
    charged: serializeCredits(record.chargedMicrocredits),
    pricingSnapshot: record.pricingSnapshot,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
  }));
}

export async function listAiUsageAggregation(userId: string) {
  const groups = await prisma.aiUsageRecord.groupBy({
    by: ["provider", "model"],
    where: { userId },
    _count: {
      _all: true,
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cacheWriteTokens: true,
      cacheReadTokens: true,
      totalTokens: true,
      chargedMicrocredits: true,
    },
    orderBy: {
      _sum: {
        chargedMicrocredits: "desc",
      },
    },
  });

  return groups.map((group) => ({
    provider: group.provider,
    model: group.model,
    requestCount: group._count._all,
    inputTokens: (group._sum.inputTokens || BigInt(0)).toString(),
    outputTokens: (group._sum.outputTokens || BigInt(0)).toString(),
    cacheWriteTokens: (group._sum.cacheWriteTokens || BigInt(0)).toString(),
    cacheReadTokens: (group._sum.cacheReadTokens || BigInt(0)).toString(),
    totalTokens: (group._sum.totalTokens || BigInt(0)).toString(),
    charged: serializeCredits(group._sum.chargedMicrocredits || BigInt(0)),
  }));
}

export async function listCreditProducts(options?: {
  activeOnly?: boolean;
  type?: BillingProductType;
}) {
  const products = await prisma.creditProduct.findMany({
    where: {
      ...(options?.activeOnly ? { active: true } : {}),
      ...(options?.type ? { type: options.type } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { unitAmount: "asc" }],
  });

  return products.map(serializeCreditProduct);
}

export async function upsertCreditProduct(input: UpsertCreditProductInput) {
  const product = await prisma.creditProduct.upsert({
    where: { code: input.code },
    update: {
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      billingInterval: input.billingInterval ?? BillingInterval.ONE_TIME,
      currency: (input.currency || "usd").toLowerCase(),
      unitAmount: input.unitAmount,
      creditsMicrocredits: creditsToMicrocredits(input.credits),
      bonusMicrocredits: creditsToMicrocredits(input.bonusCredits ?? 0),
      stripeProductId: input.stripeProductId ?? null,
      stripePriceId: input.stripePriceId ?? null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      ...withOptionalJson("metadata", input.metadata),
    },
    create: {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      billingInterval: input.billingInterval ?? BillingInterval.ONE_TIME,
      currency: (input.currency || "usd").toLowerCase(),
      unitAmount: input.unitAmount,
      creditsMicrocredits: creditsToMicrocredits(input.credits),
      bonusMicrocredits: creditsToMicrocredits(input.bonusCredits ?? 0),
      stripeProductId: input.stripeProductId ?? null,
      stripePriceId: input.stripePriceId ?? null,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      ...withOptionalJson("metadata", input.metadata),
    },
  });

  return serializeCreditProduct(product);
}

export async function listAiModelPricing(activeOnly = false) {
  const pricing = await prisma.aiModelPricing.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ provider: "asc" }, { model: "asc" }],
  });

  return pricing.map(serializeAiModelPricing);
}

export async function estimateAiUsageCharge(input: {
  provider: string;
  model: string;
  usage: AiUsageInput;
}) {
  const pricing = await prisma.aiModelPricing.findFirst({
    where: {
      provider: input.provider,
      model: input.model,
      active: true,
    },
  });

  if (!pricing) {
    throw new MissingModelPricingError(
      `No active pricing rule for ${input.provider}/${input.model}`
    );
  }

  const normalizedUsage = normalizeUsage(input.usage);
  const usageCost = calculateUsageCost(pricing, normalizedUsage);

  return {
    pricing: serializeAiModelPricing(pricing),
    usage: {
      inputTokens: normalizedUsage.inputTokens.toString(),
      outputTokens: normalizedUsage.outputTokens.toString(),
      cacheWriteTokens: normalizedUsage.cacheWriteTokens.toString(),
      cacheReadTokens: normalizedUsage.cacheReadTokens.toString(),
      totalTokens: normalizedUsage.totalTokens.toString(),
    },
    charge: serializeUsageCostBreakdown(usageCost),
    totalMicrocredits: usageCost.totalMicrocredits,
  };
}

export async function upsertAiModelPricing(input: UpsertAiModelPricingInput) {
  const pricing = await prisma.aiModelPricing.upsert({
    where: {
      provider_model: {
        provider: input.provider,
        model: input.model,
      },
    },
    update: {
      displayName: input.displayName ?? null,
      active: input.active ?? true,
      promptMicrocreditsPerMillion: creditsToMicrocredits(
        input.promptCreditsPerMillion
      ),
      completionMicrocreditsPerMillion: creditsToMicrocredits(
        input.completionCreditsPerMillion
      ),
      cacheWriteMicrocreditsPerMillion: creditsToMicrocredits(
        input.cacheWriteCreditsPerMillion ?? 0
      ),
      cacheReadMicrocreditsPerMillion: creditsToMicrocredits(
        input.cacheReadCreditsPerMillion ?? 0
      ),
      minimumChargeMicrocredits: creditsToMicrocredits(
        input.minimumChargeCredits ?? 0
      ),
      ...withOptionalJson("metadata", input.metadata),
    },
    create: {
      provider: input.provider,
      model: input.model,
      displayName: input.displayName ?? null,
      active: input.active ?? true,
      promptMicrocreditsPerMillion: creditsToMicrocredits(
        input.promptCreditsPerMillion
      ),
      completionMicrocreditsPerMillion: creditsToMicrocredits(
        input.completionCreditsPerMillion
      ),
      cacheWriteMicrocreditsPerMillion: creditsToMicrocredits(
        input.cacheWriteCreditsPerMillion ?? 0
      ),
      cacheReadMicrocreditsPerMillion: creditsToMicrocredits(
        input.cacheReadCreditsPerMillion ?? 0
      ),
      minimumChargeMicrocredits: creditsToMicrocredits(
        input.minimumChargeCredits ?? 0
      ),
      ...withOptionalJson("metadata", input.metadata),
    },
  });

  return serializeAiModelPricing(pricing);
}

export async function grantCredits(input: {
  userId: string;
  amountMicrocredits: bigint;
  source: CreditLedgerEntrySource;
  sourceRef?: string | null;
  description?: string | null;
  checkoutSessionId?: string | null;
  subscriptionId?: string | null;
  entryType?: CreditLedgerEntryType;
  metadata?: Prisma.InputJsonValue | null;
}) {
  if (input.amountMicrocredits <= BigInt(0)) {
    throw new Error("Credit grants must be positive");
  }

  return prisma.$transaction(async (tx) => {
    if (input.sourceRef) {
      const existingEntry = await tx.creditLedgerEntry.findFirst({
        where: {
          source: input.source,
          sourceRef: input.sourceRef,
        },
      });

      if (existingEntry) {
        const account = await tx.billingAccount.findUniqueOrThrow({
          where: { id: existingEntry.billingAccountId },
        });

        return {
          alreadyApplied: true,
          entryId: existingEntry.id,
          balance: serializeBillingAccount(account),
        };
      }
    }

    const billingAccount = await ensureBillingAccount(input.userId, tx);
    const updatedAccount = await tx.billingAccount.update({
      where: { id: billingAccount.id },
      data: {
        balanceMicrocredits: { increment: input.amountMicrocredits },
        lifetimeCreditedMicrocredits: { increment: input.amountMicrocredits },
      },
    });

    const ledgerEntry = await tx.creditLedgerEntry.create({
      data: {
        userId: input.userId,
        billingAccountId: billingAccount.id,
        type: input.entryType ?? CreditLedgerEntryType.CREDIT,
        source: input.source,
        sourceRef: input.sourceRef ?? null,
        amountMicrocredits: input.amountMicrocredits,
        balanceAfterMicrocredits: updatedAccount.balanceMicrocredits,
        description: input.description ?? null,
        checkoutSessionId: input.checkoutSessionId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        ...withOptionalJson("metadata", input.metadata),
      },
    });

    return {
      alreadyApplied: false,
      entryId: ledgerEntry.id,
      balance: serializeBillingAccount(updatedAccount),
    };
  });
}

export async function chargeAiUsage(input: ChargeAiUsageInput) {
  const normalizedUsage = normalizeUsage(input.usage);

  if (input.externalId) {
    const existingUsage = await prisma.aiUsageRecord.findUnique({
      where: { externalId: input.externalId },
      include: {
        billingAccount: true,
      },
    });

    if (existingUsage) {
      const existingCharge =
        typeof existingUsage.pricingSnapshot === "object" &&
        existingUsage.pricingSnapshot &&
        "charge" in existingUsage.pricingSnapshot
          ? (existingUsage.pricingSnapshot as { charge: unknown }).charge
          : { total: serializeCredits(existingUsage.chargedMicrocredits) };

      return {
        alreadyRecorded: true,
        usageId: existingUsage.id,
        charge: existingCharge,
        balance: serializeBillingAccount(existingUsage.billingAccount),
      };
    }
  }

  const pricing = await prisma.aiModelPricing.findFirst({
    where: {
      provider: input.provider,
      model: input.model,
      active: true,
    },
  });

  if (!pricing) {
    throw new MissingModelPricingError(
      `No active pricing rule for ${input.provider}/${input.model}`
    );
  }

  const usageCost = calculateUsageCost(pricing, normalizedUsage);
  const pricingSnapshot = createUsagePricingSnapshot(
    pricing,
    normalizedUsage,
    usageCost
  );

  return prisma.$transaction(async (tx) => {
    if (input.externalId) {
      const existingUsage = await tx.aiUsageRecord.findUnique({
        where: { externalId: input.externalId },
        include: {
          billingAccount: true,
        },
      });

      if (existingUsage) {
        const existingCharge =
          typeof existingUsage.pricingSnapshot === "object" &&
          existingUsage.pricingSnapshot &&
          "charge" in existingUsage.pricingSnapshot
            ? (existingUsage.pricingSnapshot as { charge: unknown }).charge
            : { total: serializeCredits(existingUsage.chargedMicrocredits) };

        return {
          alreadyRecorded: true,
          usageId: existingUsage.id,
          charge: existingCharge,
          balance: serializeBillingAccount(existingUsage.billingAccount),
        };
      }
    }

    const billingAccount = await ensureBillingAccount(input.userId, tx);
    let updatedAccount = billingAccount;

    if (usageCost.totalMicrocredits > BigInt(0)) {
      const debitResult = await tx.billingAccount.updateMany({
        where: {
          id: billingAccount.id,
          balanceMicrocredits: { gte: usageCost.totalMicrocredits },
        },
        data: {
          balanceMicrocredits: { decrement: usageCost.totalMicrocredits },
          lifetimeDebitedMicrocredits: { increment: usageCost.totalMicrocredits },
        },
      });

      if (debitResult.count !== 1) {
        throw new InsufficientCreditsError("Insufficient credits");
      }

      updatedAccount = await tx.billingAccount.findUniqueOrThrow({
        where: { id: billingAccount.id },
      });
    }

    const usageRecord = await tx.aiUsageRecord.create({
      data: {
        userId: input.userId,
        billingAccountId: billingAccount.id,
        apiKeyId: input.apiKeyId ?? null,
        pricingId: pricing.id,
        externalId: input.externalId ?? null,
        provider: input.provider,
        model: input.model,
        inputTokens: normalizedUsage.inputTokens,
        outputTokens: normalizedUsage.outputTokens,
        cacheWriteTokens: normalizedUsage.cacheWriteTokens,
        cacheReadTokens: normalizedUsage.cacheReadTokens,
        totalTokens: normalizedUsage.totalTokens,
        chargedMicrocredits: usageCost.totalMicrocredits,
        pricingSnapshot,
        ...withOptionalJson("metadata", input.metadata),
      },
    });

    if (usageCost.totalMicrocredits > BigInt(0)) {
      await tx.creditLedgerEntry.create({
        data: {
          userId: input.userId,
          billingAccountId: billingAccount.id,
          aiUsageId: usageRecord.id,
          type: CreditLedgerEntryType.DEBIT,
          source: CreditLedgerEntrySource.AI_USAGE,
          sourceRef: input.externalId ?? usageRecord.id,
          amountMicrocredits: usageCost.totalMicrocredits,
          balanceAfterMicrocredits: updatedAccount.balanceMicrocredits,
          description: `AI usage charge for ${input.provider}/${input.model}`,
          metadata: pricingSnapshot,
        },
      });
    }

    return {
      alreadyRecorded: false,
      usageId: usageRecord.id,
      charge: serializeUsageCostBreakdown(usageCost),
      balance: serializeBillingAccount(updatedAccount),
      pricing: serializeAiModelPricing(pricing),
      usage: {
        inputTokens: normalizedUsage.inputTokens.toString(),
        outputTokens: normalizedUsage.outputTokens.toString(),
        cacheWriteTokens: normalizedUsage.cacheWriteTokens.toString(),
        cacheReadTokens: normalizedUsage.cacheReadTokens.toString(),
        totalTokens: normalizedUsage.totalTokens.toString(),
      },
    };
  });
}

export async function createStripeCheckoutSession(input: {
  userId: string;
  productId?: string;
  productCode?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const product = await findProductByLookup({
    productId: input.productId,
    productCode: input.productCode,
  });

  if (!product || !product.active) {
    throw new BillingConfigError("Credit product not found");
  }

  if (!product.stripePriceId) {
    throw new BillingConfigError(
      `Credit product ${product.code} is missing stripePriceId`
    );
  }

  const billingAccount = await ensureBillingAccount(input.userId);
  const stripeCustomerId = await getOrCreateStripeCustomer(input.userId);
  const stripe = getStripe();
  const metadata = {
    userId: input.userId,
    productId: product.id,
    productCode: product.code,
    billingAccountId: billingAccount.id,
  };

  const session = await stripe.checkout.sessions.create({
    mode:
      product.type === BillingProductType.MEMBERSHIP
        ? "subscription"
        : "payment",
    customer: stripeCustomerId,
    line_items: [{ price: product.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata,
    ...(product.type === BillingProductType.MEMBERSHIP
      ? {
          subscription_data: {
            metadata,
          },
        }
      : {}),
  });

  await prisma.billingCheckoutSession.create({
    data: {
      userId: input.userId,
      billingAccountId: billingAccount.id,
      productId: product.id,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null,
      stripeInvoiceId:
        typeof session.invoice === "string"
          ? session.invoice
          : session.invoice?.id || null,
      status: "PENDING",
      amountTotal: session.amount_total ?? null,
      currency: session.currency || product.currency,
      expiresAt: toDate(session.expires_at),
      metadata: stringifyStripeObject(metadata),
    },
  });

  return {
    checkoutSessionId: session.id,
    url: session.url,
    product: serializeCreditProduct(product),
  };
}

const SERVICE_FEE_RATE = 0.055;

export async function createCustomAmountCheckoutSession(input: {
  userId: string;
  amountDollars: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const { amountDollars } = input;
  if (amountDollars < 5 || amountDollars > 10000) {
    throw new BillingConfigError("Amount must be between $5 and $10,000");
  }

  const totalCents = Math.ceil(amountDollars * (1 + SERVICE_FEE_RATE) * 100);
  const creditsMicrocredits = creditsToMicrocredits(amountDollars);

  const billingAccount = await ensureBillingAccount(input.userId);
  const stripeCustomerId = await getOrCreateStripeCustomer(input.userId);
  const stripe = getStripe();
  const metadata = {
    userId: input.userId,
    billingAccountId: billingAccount.id,
    customAmount: "true",
    creditsDollars: String(amountDollars),
    creditsMicrocredits: String(creditsMicrocredits),
  };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${amountDollars} AI Credits`,
            description: `Top-up ${amountDollars} credits for AI usage`,
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata,
  });

  await prisma.billingCheckoutSession.create({
    data: {
      userId: input.userId,
      billingAccountId: billingAccount.id,
      productId: null,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null,
      status: "PENDING",
      amountTotal: session.amount_total ?? totalCents,
      currency: "usd",
      expiresAt: toDate(session.expires_at),
      metadata: stringifyStripeObject(metadata),
    },
  });

  return {
    checkoutSessionId: session.id,
    url: session.url,
  };
}

async function handleTopUpCheckoutCompletion(
  checkoutRecord: Awaited<ReturnType<typeof getOrCreateCheckoutRecord>>
) {
  if (!checkoutRecord.product) {
    throw new BillingConfigError("Product checkout missing product reference");
  }

  const grantAmount = productGrantMicrocredits(checkoutRecord.product);

  const grantResult = await grantCredits({
    userId: checkoutRecord.userId,
    amountMicrocredits: grantAmount,
    source: CreditLedgerEntrySource.TOP_UP,
    sourceRef: checkoutRecord.stripeCheckoutSessionId,
    description: `Stripe top-up: ${checkoutRecord.product.name}`,
    checkoutSessionId: checkoutRecord.id,
    metadata: {
      checkoutSessionId: checkoutRecord.stripeCheckoutSessionId,
      productCode: checkoutRecord.product.code,
    },
  });

  await prisma.billingCheckoutSession.update({
    where: { id: checkoutRecord.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      creditsGrantedMicrocredits: grantAmount,
    },
  });

  return grantResult;
}

async function handleStripeCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const checkoutRecord = await getOrCreateCheckoutRecord(session);

  await prisma.billingCheckoutSession.update({
    where: { id: checkoutRecord.id },
    data: {
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null,
      stripeInvoiceId:
        typeof session.invoice === "string"
          ? session.invoice
          : session.invoice?.id || null,
      status: "COMPLETED",
      amountTotal: session.amount_total ?? checkoutRecord.amountTotal,
      currency: session.currency || checkoutRecord.currency,
      completedAt: new Date(),
      expiresAt: toDate(session.expires_at),
    },
  });

  // Custom amount checkout (no linked product)
  if (session.metadata?.customAmount === "true") {
    const creditsMicrocredits = BigInt(session.metadata.creditsMicrocredits || "0");
    const creditsDollars = session.metadata.creditsDollars || "0";

    const grantResult = await grantCredits({
      userId: checkoutRecord.userId,
      amountMicrocredits: creditsMicrocredits,
      source: CreditLedgerEntrySource.TOP_UP,
      sourceRef: checkoutRecord.stripeCheckoutSessionId,
      description: `Top-up: $${creditsDollars} credits`,
      checkoutSessionId: checkoutRecord.id,
      metadata: {
        checkoutSessionId: checkoutRecord.stripeCheckoutSessionId,
        customAmount: true,
        creditsDollars,
      },
    });

    await prisma.billingCheckoutSession.update({
      where: { id: checkoutRecord.id },
      data: {
        creditsGrantedMicrocredits: creditsMicrocredits,
      },
    });

    return grantResult;
  }

  if (checkoutRecord.product?.type === BillingProductType.TOP_UP) {
    await handleTopUpCheckoutCompletion(checkoutRecord);
    return;
  }

  if (typeof session.subscription === "string") {
    await syncBillingSubscriptionByStripeId(session.subscription);
  }
}

async function handleStripeInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof invoiceSubscription === "string"
      ? invoiceSubscription
      : invoiceSubscription?.id;

  if (!subscriptionId) {
    return;
  }

  const subscription = await syncBillingSubscriptionByStripeId(subscriptionId);
  const product = await prisma.creditProduct.findUniqueOrThrow({
    where: { id: subscription.productId },
  });
  const grantAmount = productGrantMicrocredits(product);

  await grantCredits({
    userId: subscription.userId,
    amountMicrocredits: grantAmount,
    source: CreditLedgerEntrySource.MEMBERSHIP,
    sourceRef: invoice.id,
    description: `Membership credit grant: ${product.name}`,
    subscriptionId: subscription.id,
    metadata: {
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      productCode: product.code,
    },
  });

  await prisma.billingSubscription.update({
    where: { id: subscription.id },
    data: {
      stripeLatestInvoiceId: invoice.id,
    },
  });
}

async function handleStripeSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  await syncBillingSubscriptionFromStripeSubscription(subscription);
}

export async function processStripeWebhook(rawBody: string, signature: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new BillingConfigError("Missing STRIPE_WEBHOOK_SECRET");
  }
  if (!signature) {
    throw new BillingConfigError("Missing Stripe signature");
  }

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });

  if (existingEvent?.status === "PROCESSED" || existingEvent?.status === "IGNORED") {
    return {
      duplicate: true,
      eventId: event.id,
      type: event.type,
      status: existingEvent.status,
    };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleStripeCheckoutCompleted(event);
        break;
      case "invoice.paid":
        await handleStripeInvoicePaid(event);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleStripeSubscriptionUpdated(event);
        break;
      default:
        await prisma.stripeWebhookEvent.upsert({
          where: { stripeEventId: event.id },
          update: {
            type: event.type,
            status: "IGNORED",
            payload: stringifyStripeObject(event),
            errorMessage: null,
            processedAt: new Date(),
          },
          create: {
            stripeEventId: event.id,
            type: event.type,
            status: "IGNORED",
            payload: stringifyStripeObject(event),
            processedAt: new Date(),
          },
        });

        return {
          duplicate: false,
          eventId: event.id,
          type: event.type,
          status: "IGNORED",
        };
    }

    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      update: {
        type: event.type,
        status: "PROCESSED",
        payload: stringifyStripeObject(event),
        errorMessage: null,
        processedAt: new Date(),
      },
      create: {
        stripeEventId: event.id,
        type: event.type,
        status: "PROCESSED",
        payload: stringifyStripeObject(event),
        processedAt: new Date(),
      },
    });

    return {
      duplicate: false,
      eventId: event.id,
      type: event.type,
      status: "PROCESSED",
    };
  } catch (error) {
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      update: {
        type: event.type,
        status: "FAILED",
        payload: stringifyStripeObject(event),
        errorMessage: error instanceof Error ? error.message : "Unknown Stripe webhook error",
        processedAt: new Date(),
      },
      create: {
        stripeEventId: event.id,
        type: event.type,
        status: "FAILED",
        payload: stringifyStripeObject(event),
        errorMessage: error instanceof Error ? error.message : "Unknown Stripe webhook error",
        processedAt: new Date(),
      },
    });

    throw error;
  }
}

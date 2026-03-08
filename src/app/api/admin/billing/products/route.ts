import { BillingInterval, BillingProductType, Prisma } from "@prisma/client";
import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { requireAdminUser } from "@/lib/billing/admin";
import { listCreditProducts, upsertCreditProduct } from "@/lib/billing/service";

const PRODUCT_TYPES = Object.values(BillingProductType);
const BILLING_INTERVALS = Object.values(BillingInterval);

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const products = await listCreditProducts();
  return jsonSuccess({ products });
}

export async function POST(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const {
    code,
    name,
    description,
    type,
    billingInterval,
    currency,
    unitAmount,
    credits,
    bonusCredits,
    stripeProductId,
    stripePriceId,
    active,
    sortOrder,
    metadata,
  } = body as {
    code?: string;
    name?: string;
    description?: string | null;
    type?: BillingProductType;
    billingInterval?: BillingInterval;
    currency?: string;
    unitAmount?: number;
    credits?: string | number;
    bonusCredits?: string | number;
    stripeProductId?: string | null;
    stripePriceId?: string | null;
    active?: boolean;
    sortOrder?: number;
    metadata?: Record<string, unknown> | null;
  };

  if (!code || !name || !type || unitAmount === undefined || credits === undefined) {
    return jsonError(
      "VALIDATION_ERROR",
      "code, name, type, unitAmount, and credits are required",
      400
    );
  }

  if (!PRODUCT_TYPES.includes(type)) {
    return jsonError(
      "VALIDATION_ERROR",
      `type must be one of: ${PRODUCT_TYPES.join(", ")}`,
      400
    );
  }

  if (
    billingInterval !== undefined &&
    !BILLING_INTERVALS.includes(billingInterval)
  ) {
    return jsonError(
      "VALIDATION_ERROR",
      `billingInterval must be one of: ${BILLING_INTERVALS.join(", ")}`,
      400
    );
  }

  if (!Number.isInteger(unitAmount) || unitAmount < 0) {
    return jsonError(
      "VALIDATION_ERROR",
      "unitAmount must be a non-negative integer in the smallest currency unit",
      400
    );
  }

  const product = await upsertCreditProduct({
    code,
    name,
    description,
    type,
    billingInterval,
    currency,
    unitAmount,
    credits,
    bonusCredits,
    stripeProductId,
    stripePriceId,
    active,
    sortOrder,
    metadata: metadata as Prisma.InputJsonValue | null | undefined,
  });

  return jsonSuccess({ product });
}

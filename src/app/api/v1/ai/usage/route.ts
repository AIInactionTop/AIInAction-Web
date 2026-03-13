import { Prisma } from "@prisma/client";
import { jsonError, jsonSuccess, requireApiKeySession } from "@/lib/api-auth";
import {
  BillingConfigError,
  InsufficientCreditsError,
  MissingModelPricingError,
  chargeAiUsage,
} from "@/lib/billing/service";

export async function POST(request: Request) {
  const { user, apiKeyId, error } = await requireApiKeySession(request);
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const {
    provider,
    model,
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    externalId,
    metadata,
  } = body as {
    provider?: string;
    model?: string;
    inputTokens?: number | string;
    outputTokens?: number | string;
    cacheWriteTokens?: number | string;
    cacheReadTokens?: number | string;
    externalId?: string;
    metadata?: Record<string, unknown> | null;
  };

  if (!provider || !model) {
    return jsonError(
      "VALIDATION_ERROR",
      "provider and model are required",
      400
    );
  }

  try {
    const result = await chargeAiUsage({
      userId: user!.id,
      apiKeyId,
      provider,
      model,
      externalId,
      usage: {
        inputTokens,
        outputTokens,
        cacheWriteTokens,
        cacheReadTokens,
      },
      metadata: metadata as Prisma.InputJsonValue | null | undefined,
    });

    return jsonSuccess(result, result.alreadyRecorded ? 200 : 201);
  } catch (chargeError) {
    if (chargeError instanceof MissingModelPricingError) {
      return jsonError("MISSING_MODEL_PRICING", chargeError.message, 400);
    }
    if (chargeError instanceof InsufficientCreditsError) {
      return jsonError("INSUFFICIENT_CREDITS", chargeError.message, 402);
    }
    if (chargeError instanceof BillingConfigError) {
      return jsonError("BILLING_CONFIG_ERROR", chargeError.message, 400);
    }

    throw chargeError;
  }
}

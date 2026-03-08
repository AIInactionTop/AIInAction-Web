import { Prisma } from "@prisma/client";
import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { requireAdminUser } from "@/lib/billing/admin";
import { listAiModelPricing, upsertAiModelPricing } from "@/lib/billing/service";

export async function GET() {
  const { error } = await requireAdminUser();
  if (error) return error;

  const pricing = await listAiModelPricing();
  return jsonSuccess({ pricing });
}

export async function POST(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const {
    provider,
    model,
    displayName,
    active,
    promptCreditsPerMillion,
    completionCreditsPerMillion,
    cacheWriteCreditsPerMillion,
    cacheReadCreditsPerMillion,
    minimumChargeCredits,
    metadata,
  } = body as {
    provider?: string;
    model?: string;
    displayName?: string | null;
    active?: boolean;
    promptCreditsPerMillion?: string | number;
    completionCreditsPerMillion?: string | number;
    cacheWriteCreditsPerMillion?: string | number;
    cacheReadCreditsPerMillion?: string | number;
    minimumChargeCredits?: string | number;
    metadata?: Record<string, unknown> | null;
  };

  if (!provider || !model) {
    return jsonError(
      "VALIDATION_ERROR",
      "provider and model are required",
      400
    );
  }

  if (
    promptCreditsPerMillion === undefined ||
    completionCreditsPerMillion === undefined
  ) {
    return jsonError(
      "VALIDATION_ERROR",
      "promptCreditsPerMillion and completionCreditsPerMillion are required",
      400
    );
  }

  const pricing = await upsertAiModelPricing({
    provider,
    model,
    displayName,
    active,
    promptCreditsPerMillion,
    completionCreditsPerMillion,
    cacheWriteCreditsPerMillion,
    cacheReadCreditsPerMillion,
    minimumChargeCredits,
    metadata: metadata as Prisma.InputJsonValue | null | undefined,
  });

  return jsonSuccess({ pricing });
}

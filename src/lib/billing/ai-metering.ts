import { randomUUID } from "crypto";
import { convertToModelMessages, streamText } from "ai";
import type { LanguageModel, UIMessage } from "ai";
import { jsonError } from "@/lib/api-auth";
import {
  BillingConfigError,
  InsufficientCreditsError,
  MissingModelPricingError,
  chargeAiUsage,
  estimateAiUsageCharge,
  requireCreditBalanceAtLeast,
} from "@/lib/billing/service";

function estimatePromptTokens(messages: UIMessage[], systemPrompt: string) {
  const serializedLength = JSON.stringify({
    systemPrompt,
    messages,
  }).length;

  return Math.max(1, Math.ceil(serializedLength / 3));
}

function createAiBillingErrorResponse(error: unknown) {
  if (error instanceof InsufficientCreditsError) {
    return jsonError("INSUFFICIENT_CREDITS", error.message, 402);
  }

  if (error instanceof MissingModelPricingError) {
    return jsonError("MISSING_MODEL_PRICING", error.message, 400);
  }

  if (error instanceof BillingConfigError) {
    return jsonError("BILLING_CONFIG_ERROR", error.message, 400);
  }

  throw error;
}

export async function createMeteredChatResponse(input: {
  userId: string;
  routeName: string;
  provider: string;
  modelId: string;
  systemPrompt: string;
  messages: UIMessage[];
  model: LanguageModel;
  maxOutputTokens: number;
}) {
  const estimatedInputTokens = estimatePromptTokens(
    input.messages,
    input.systemPrompt
  );
  const preflight = await estimateAiUsageCharge({
    provider: input.provider,
    model: input.modelId,
    usage: {
      inputTokens: estimatedInputTokens,
      outputTokens: input.maxOutputTokens,
    },
  }).catch(createAiBillingErrorResponse);

  if (preflight instanceof Response) {
    return preflight;
  }

  const reserveMicrocredits = preflight.totalMicrocredits;
  const balanceCheck = await requireCreditBalanceAtLeast(
    input.userId,
    reserveMicrocredits
  ).catch(createAiBillingErrorResponse);

  if (balanceCheck instanceof Response) {
    return balanceCheck;
  }

  const usageExternalId = randomUUID();
  const result = streamText({
    model: input.model,
    system: input.systemPrompt,
    messages: await convertToModelMessages(input.messages),
    maxOutputTokens: input.maxOutputTokens,
    onFinish: async ({ usage, finishReason }) => {
      if (finishReason === "error") {
        return;
      }

      const nonCachedInputTokens =
        usage.inputTokenDetails.noCacheTokens ?? usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      const cacheWriteTokens = usage.inputTokenDetails.cacheWriteTokens ?? 0;
      const cacheReadTokens = usage.inputTokenDetails.cacheReadTokens ?? 0;

      try {
        await chargeAiUsage({
          userId: input.userId,
          provider: input.provider,
          model: input.modelId,
          externalId: usageExternalId,
          usage: {
            inputTokens: nonCachedInputTokens,
            outputTokens,
            cacheWriteTokens,
            cacheReadTokens,
          },
          metadata: {
            routeName: input.routeName,
            finishReason,
            reserveMicrocredits: reserveMicrocredits.toString(),
            estimatedInputTokens,
            usage: {
              inputTokens: usage.inputTokens ?? 0,
              outputTokens,
              cacheWriteTokens,
              cacheReadTokens,
            },
          },
        });
      } catch (error) {
        console.error("Failed to charge AI usage", {
          routeName: input.routeName,
          userId: input.userId,
          provider: input.provider,
          model: input.modelId,
          usageExternalId,
          error,
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

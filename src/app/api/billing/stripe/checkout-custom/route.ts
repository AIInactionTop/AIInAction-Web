import { jsonError, jsonSuccess } from "@/lib/api-auth";
import {
  BillingConfigError,
  createCustomAmountCheckoutSession,
} from "@/lib/billing/service";
import { requireSessionUser } from "@/lib/session-auth";

function resolveAbsoluteUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) {
    return jsonError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const { amount, successUrl, cancelUrl } = body as {
    amount?: number;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 5 || amount > 10000) {
    return jsonError(
      "VALIDATION_ERROR",
      "Amount must be a number between 5 and 10000",
      400
    );
  }

  // Only allow whole dollar amounts
  if (amount !== Math.floor(amount)) {
    return jsonError(
      "VALIDATION_ERROR",
      "Amount must be a whole number",
      400
    );
  }

  const resolvedSuccessUrl = resolveAbsoluteUrl(successUrl);
  const resolvedCancelUrl = resolveAbsoluteUrl(cancelUrl);

  if (!resolvedSuccessUrl || !resolvedCancelUrl) {
    return jsonError(
      "VALIDATION_ERROR",
      "successUrl and cancelUrl must be valid absolute or app-relative URLs",
      400
    );
  }

  try {
    const checkout = await createCustomAmountCheckoutSession({
      userId: user!.id,
      amountDollars: amount,
      successUrl: resolvedSuccessUrl,
      cancelUrl: resolvedCancelUrl,
    });

    return jsonSuccess(checkout, 201);
  } catch (checkoutError) {
    if (checkoutError instanceof BillingConfigError) {
      return jsonError("BILLING_CONFIG_ERROR", checkoutError.message, 400);
    }

    throw checkoutError;
  }
}

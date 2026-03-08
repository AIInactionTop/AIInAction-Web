import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { BillingConfigError, createStripeCheckoutSession } from "@/lib/billing/service";
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

  const { productId, productCode, successUrl, cancelUrl } = body as {
    productId?: string;
    productCode?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!productId && !productCode) {
    return jsonError(
      "VALIDATION_ERROR",
      "Either productId or productCode is required",
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
    const checkout = await createStripeCheckoutSession({
      userId: user!.id,
      productId,
      productCode,
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

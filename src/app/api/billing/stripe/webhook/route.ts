import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { BillingConfigError, processStripeWebhook } from "@/lib/billing/service";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  try {
    const result = await processStripeWebhook(rawBody, signature);
    return jsonSuccess(result);
  } catch (error) {
    if (error instanceof BillingConfigError) {
      return jsonError("BILLING_CONFIG_ERROR", error.message, 400);
    }

    return jsonError(
      "STRIPE_WEBHOOK_ERROR",
      error instanceof Error ? error.message : "Failed to process Stripe webhook",
      400
    );
  }
}

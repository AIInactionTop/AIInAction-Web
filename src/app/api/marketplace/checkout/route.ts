import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { requireSessionUser } from "@/lib/session-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const PLATFORM_FEE_RATE = 0.1;

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
  if (!body) return jsonError("BAD_REQUEST", "Invalid JSON body", 400);

  const { itemId, successUrl, cancelUrl } = body as {
    itemId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!itemId) return jsonError("VALIDATION_ERROR", "itemId is required", 400);

  const resolvedSuccessUrl = resolveAbsoluteUrl(successUrl);
  const resolvedCancelUrl = resolveAbsoluteUrl(cancelUrl);
  if (!resolvedSuccessUrl || !resolvedCancelUrl) {
    return jsonError("VALIDATION_ERROR", "successUrl and cancelUrl are required", 400);
  }

  const item = await prisma.marketplaceItem.findUnique({
    where: { id: itemId },
    include: { seller: { select: { id: true, stripeConnectAccountId: true } } },
  });

  if (!item || item.status !== "PUBLISHED") {
    return jsonError("NOT_FOUND", "Item not found", 404);
  }
  if (item.price === 0) {
    return jsonError("VALIDATION_ERROR", "Free items do not require checkout", 400);
  }
  if (item.sellerId === user!.id) {
    return jsonError("VALIDATION_ERROR", "Cannot purchase your own item", 400);
  }

  const existing = await prisma.marketplacePurchase.findUnique({
    where: { userId_itemId: { userId: user!.id, itemId } },
  });
  if (existing) {
    return jsonError("VALIDATION_ERROR", "Already purchased", 400);
  }

  if (!item.seller.stripeConnectAccountId) {
    return jsonError("SELLER_NOT_CONNECTED", "Seller has not enabled payments", 400);
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(item.seller.stripeConnectAccountId);
  if (!account.charges_enabled) {
    return jsonError("SELLER_NOT_CONNECTED", "Seller payment account is not ready", 400);
  }

  const applicationFee = Math.ceil(item.price * PLATFORM_FEE_RATE);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: item.currency,
          product_data: {
            name: item.title,
            description: item.description.substring(0, 500),
          },
          unit_amount: item.price,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: item.seller.stripeConnectAccountId,
      },
    },
    metadata: {
      marketplacePurchase: "true",
      itemId: item.id,
      buyerId: user!.id,
      sellerId: item.sellerId,
      itemPrice: String(item.price),
      itemCurrency: item.currency,
    },
    success_url: resolvedSuccessUrl,
    cancel_url: resolvedCancelUrl,
  });

  return jsonSuccess({ checkoutSessionId: session.id, url: session.url }, 201);
}

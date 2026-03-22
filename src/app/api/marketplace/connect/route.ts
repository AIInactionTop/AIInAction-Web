import { jsonError, jsonSuccess } from "@/lib/api-auth";
import { requireSessionUser } from "@/lib/session-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const stripe = getStripe();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user!.id } });

  let accountId = dbUser.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { userId: user!.id },
      ...(dbUser.email ? { email: dbUser.email } : {}),
    });
    accountId = account.id;

    await prisma.user.update({
      where: { id: user!.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/marketplace/connect/refresh`,
      return_url: `${baseUrl}/api/marketplace/connect/return`,
      type: "account_onboarding",
    });

    return jsonSuccess({ url: accountLink.url }, 201);
  } catch (err) {
    return jsonError(
      "CONNECT_ERROR",
      err instanceof Error ? err.message : "Failed to create Connect link",
      400
    );
  }
}

import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user!.id } });
  if (!dbUser.stripeConnectAccountId) {
    redirect("/marketplace");
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const accountLink = await stripe.accountLinks.create({
    account: dbUser.stripeConnectAccountId,
    refresh_url: `${baseUrl}/api/marketplace/connect/refresh`,
    return_url: `${baseUrl}/api/marketplace/connect/return`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}

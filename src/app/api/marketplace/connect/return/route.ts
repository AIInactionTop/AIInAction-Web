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
  const account = await stripe.accounts.retrieve(dbUser.stripeConnectAccountId);

  if (account.charges_enabled) {
    redirect("/marketplace?connect=success");
  } else {
    redirect("/marketplace?connect=pending");
  }
}

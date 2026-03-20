import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/billing/admin";

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !isAdminEmail(session.user.email)) {
    redirect("/");
  }
  return session.user;
}

/**
 * For use in server actions — throws Error instead of redirecting.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !isAdminEmail(session.user.email)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

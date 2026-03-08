import { jsonError } from "@/lib/api-auth";
import { requireSessionUser } from "@/lib/session-auth";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export async function requireAdminUser() {
  const { user, error } = await requireSessionUser();
  if (error) return { user: null, error };

  if (!isAdminEmail(user!.email)) {
    return {
      user: null,
      error: jsonError("FORBIDDEN", "Admin access is required", 403),
    };
  }

  return { user, error: null };
}

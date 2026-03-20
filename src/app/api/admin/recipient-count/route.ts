import { requireAdminUser } from "@/lib/billing/admin";
import { jsonSuccess, jsonError } from "@/lib/api-auth";
import { getRecipientCount, type RecipientFilter } from "@/lib/admin-emails";

const VALID_FILTERS: RecipientFilter[] = ["all", "active_30d", "completed_challenge", "has_project"];

export async function GET(request: Request) {
  const { error } = await requireAdminUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") as RecipientFilter;

  if (!filter || !VALID_FILTERS.includes(filter)) {
    return jsonError("VALIDATION_ERROR", "Invalid filter", 400);
  }

  const count = await getRecipientCount(filter);
  return jsonSuccess({ count });
}

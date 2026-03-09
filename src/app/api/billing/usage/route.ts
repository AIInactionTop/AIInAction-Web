import { jsonSuccess } from "@/lib/api-auth";
import { listRecentAiUsageRecords } from "@/lib/billing/service";
import { requireSessionUser } from "@/lib/session-auth";

export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const usage = await listRecentAiUsageRecords(user!.id, 20);
  return jsonSuccess({ usage });
}

import { jsonSuccess } from "@/lib/api-auth";
import {
  listAiUsageAggregation,
  listRecentAiUsageRecords,
} from "@/lib/billing/service";
import { requireSessionUser } from "@/lib/session-auth";

export async function GET() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  const [usage, aggregation] = await Promise.all([
    listRecentAiUsageRecords(user!.id, 20),
    listAiUsageAggregation(user!.id),
  ]);

  return jsonSuccess({ usage, aggregation });
}
